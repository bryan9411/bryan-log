"use server"

import { revalidatePath, updateTag } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import {
  adminEditPostRoute,
  POST_CREATED_PARAM,
  postDetailPath,
  ROUTE_PATTERN,
  ROUTES,
} from "@/config/routes"
import {
  createErrorState,
  createSuccessState,
  toFieldErrors,
  type ActionState,
} from "@/lib/actions/action-state"
import { requireAdmin } from "@/lib/auth/session"
import { CACHE_TAG, POSTS_FULL_TEXT_TAG, postContentTag } from "@/lib/cache-tags"
import { CONTENT_STATUS, isScheduledPublish, type ContentStatus } from "@/lib/constants/content"
import { SLUG_MAX_LENGTH, SLUG_PATTERN } from "@/lib/content/slug"
import { ContentValidationError, renderPostContent } from "@/lib/content/render-post"
import { SECTION_RELATION_SELECT, type SectionRef } from "@/lib/data/sections"
import { formatDateTime, toTaipeiDateTimeInput } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"
import { ADMIN_POSTS_PAGE_SIZE, DELETE_POSTS_FIELD } from "@/lib/validations/admin-post-list"
import { POST_FIELDS, POST_INTENT, postFormSchema, type PostField } from "@/lib/validations/post"

export type PostFormState = ActionState<PostField> & {
  // 每次成功存檔都會更新，供客戶端判斷是否需要清除本機暫存
  savedAt?: number
  // 實際寫入的發布時間，供表單同步欄位顯示（留空由伺服器決定、轉草稿時會被清空）
  publishedAt?: string | null
}

const POSTGRES_ERROR = {
  UNIQUE_VIOLATION: "23505",
  FOREIGN_KEY_VIOLATION: "23503",
  RAISE_EXCEPTION: "P0001",
} as const

const GENERIC_SAVE_ERROR = "儲存失敗，請稍後再試"

type DatabaseError = { code?: string; message: string }

function mapDatabaseError(error: DatabaseError): PostFormState {
  switch (error.code) {
    case POSTGRES_ERROR.UNIQUE_VIOLATION:
      return createErrorState("網址代稱重複", {
        fieldErrors: { slug: ["此網址代稱已被其他文章使用，請換一個"] },
      })
    case POSTGRES_ERROR.FOREIGN_KEY_VIOLATION:
      return createErrorState("區塊或分類不存在", {
        fieldErrors: { categoryId: ["所選區塊或分類已被刪除，請重新整理後再選擇"] },
      })
    case POSTGRES_ERROR.RAISE_EXCEPTION:
      // 資料庫觸發器拋出的訊息本身即為繁體中文（例如分類不屬於文章所在的區塊）
      return createErrorState(error.message, { fieldErrors: { categoryId: [error.message] } })
    default:
      return createErrorState(GENERIC_SAVE_ERROR)
  }
}

// 首頁、區塊列表與文章內頁都可能顯示這篇文章，發布或修改後一併讓快取失效
// 文章可能搬到其他區塊，因此以路由樣式一次失效所有區塊列表與文章內頁
function revalidatePostPaths() {
  // 前台資料以 "use cache" 快取，需以標籤失效才能讓首頁、列表與 sitemap 立即反映變更
  updateTag(CACHE_TAG.POSTS)
  revalidatePath(ROUTES.HOME)
  revalidatePath(ROUTE_PATTERN.SECTION, "page")
  revalidatePath(ROUTE_PATTERN.POST_DETAIL, "page")
  revalidatePath(ROUTES.ARCHIVES)
  revalidatePath(ROUTES.LLMS_TXT)
  revalidatePath(ROUTES.LLMS_FULL_TXT)
  revalidateAdminPostPaths()
}

function revalidateAdminPostPaths() {
  revalidatePath(ROUTES.ADMIN_POSTS)
  revalidatePath(ROUTES.ADMIN_POST_CATEGORIES)
  revalidatePath(ROUTES.ADMIN_DASHBOARD)
}

// 列表、搜尋與上下篇會用到的欄位；這些沒變動時，修改只影響文章自己的內頁
const POST_LISTING_FIELDS = [
  "title",
  "slug",
  "excerpt",
  "section_id",
  "category_id",
  "reading_time_minutes",
  "published_at",
] as const

const PREVIOUS_POST_COLUMNS = `status, ${POST_LISTING_FIELDS.join(", ")}`

type PostVisibilityRow = {
  status: ContentStatus
  title: string
  slug: string
  excerpt: string | null
  section_id: string
  category_id: string | null
  reading_time_minutes: number
  published_at: string | null
}

// 只讓真正受影響的快取失效：草稿不動前台；內文修改只更新該篇；其餘才全站更新
function revalidateSavedPost(
  previous: PostVisibilityRow,
  saved: PostVisibilityRow & { section: SectionRef },
) {
  const wasPublic = previous.status === CONTENT_STATUS.PUBLISHED
  const isPublic = saved.status === CONTENT_STATUS.PUBLISHED

  if (!wasPublic && !isPublic) {
    revalidateAdminPostPaths()
    return
  }

  const isListingChanged =
    wasPublic !== isPublic || POST_LISTING_FIELDS.some((field) => previous[field] !== saved[field])

  if (isListingChanged) {
    revalidatePostPaths()
    return
  }

  updateTag(postContentTag(saved.slug))
  updateTag(POSTS_FULL_TEXT_TAG)
  revalidatePath(postDetailPath(saved.section.slug, saved.slug))
  revalidatePath(ROUTES.LLMS_FULL_TXT)
  revalidateAdminPostPaths()
}

// 回傳要寫入的發布時間；undefined 表示不更動欄位（首次發布留空時由資料庫觸發器補上當下時間）
function resolvePublishedAt(requested: Date | undefined, existing: string | null) {
  if (!requested) {
    // 排程中的文章清空時間代表立即發布；已發布的文章則維持原本的日期
    return existing && Date.parse(existing) > Date.now() ? new Date().toISOString() : undefined
  }

  // 欄位只到分鐘，未修改時不能用它覆蓋，否則原本的秒數會被歸零
  if (existing && toTaipeiDateTimeInput(existing) === toTaipeiDateTimeInput(requested)) {
    return undefined
  }

  return requested.toISOString()
}

function readPostForm(formData: FormData) {
  return Object.fromEntries(POST_FIELDS.map((field) => [field, formData.get(field)]))
}

export async function savePostAction(
  _prevState: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  await requireAdmin()

  const parsed = postFormSchema.safeParse(readPostForm(formData))

  if (!parsed.success) {
    return createErrorState("請修正標示的欄位後再送出", {
      fieldErrors: toFieldErrors<PostField>(parsed.error),
    })
  }

  const {
    id,
    title,
    slug,
    excerpt,
    tldr,
    sectionId,
    categoryId,
    coverImageUrl,
    contentJson,
    publishedAt,
    intent,
  } = parsed.data
  const isPublishing = intent === POST_INTENT.PUBLISH

  let rendered: Awaited<ReturnType<typeof renderPostContent>>

  try {
    rendered = await renderPostContent(contentJson)
  } catch (error) {
    if (!(error instanceof ContentValidationError)) throw error
    return createErrorState(error.message, { fieldErrors: { contentJson: [error.message] } })
  }

  if (isPublishing && !rendered.plainText) {
    return createErrorState("發布前請先輸入文章內容", {
      fieldErrors: { contentJson: ["文章內容不可為空白"] },
    })
  }

  const supabase = await createClient()

  let previous: PostVisibilityRow | null = null

  if (id) {
    const { data, error } = await supabase
      .from("posts")
      .select(PREVIOUS_POST_COLUMNS)
      .eq("id", id)
      .maybeSingle()
      .overrideTypes<PostVisibilityRow, { merge: false }>()

    if (error) return mapDatabaseError(error)
    previous = data
  }

  const resolvedPublishedAt = isPublishing
    ? resolvePublishedAt(publishedAt, previous?.published_at ?? null)
    : undefined

  const record = {
    title,
    slug,
    // 摘要留空就存空值，不再自動擷取內文：擷取結果常與標題或開頭段落重複，顯示在文章頁頂端反而突兀
    excerpt: excerpt || null,
    tldr,
    section_id: sectionId,
    category_id: categoryId ?? null,
    cover_image_url: coverImageUrl ?? null,
    content_json: rendered.json,
    content_html: rendered.html,
    reading_time_minutes: rendered.readingMinutes,
    status: isPublishing ? CONTENT_STATUS.PUBLISHED : CONTENT_STATUS.DRAFT,
    ...(resolvedPublishedAt ? { published_at: resolvedPublishedAt } : {}),
  }

  if (!id) {
    const { data, error } = await supabase.from("posts").insert(record).select("id").single()

    if (error) return mapDatabaseError(error)

    if (isPublishing) revalidatePostPaths()
    else revalidateAdminPostPaths()
    // 新文章建立後轉往編輯頁，之後的存檔都會更新同一筆資料，避免重複新增
    redirect(`${adminEditPostRoute(data.id)}?${POST_CREATED_PARAM}=${intent}`)
  }

  const { data, error } = await supabase
    .from("posts")
    .update(record)
    .eq("id", id)
    .select(`${PREVIOUS_POST_COLUMNS}, ${SECTION_RELATION_SELECT}`)
    .maybeSingle()
    .overrideTypes<PostVisibilityRow & { section: SectionRef }, { merge: false }>()

  if (error) return mapDatabaseError(error)
  if (!data) return createErrorState("找不到這篇文章，可能已被刪除")

  if (previous) revalidateSavedPost(previous, data)
  else revalidatePostPaths()

  const successMessage = isScheduledPublish(data.status, data.published_at)
    ? `已排程，將於 ${formatDateTime(data.published_at as string)} 發布`
    : isPublishing
      ? "文章已發布，前台內容已即時更新"
      : "草稿已儲存"

  return {
    ...createSuccessState<PostField>(successMessage),
    savedAt: Date.now(),
    publishedAt: data.published_at,
  }
}

export type DeletePostsState = ActionState

// 單篇與批次刪除共用；上限與每頁筆數一致，避免一次送出過多識別碼
const deletePostIdsSchema = z
  .array(z.uuid("文章識別碼不正確"))
  .min(1, "請至少選取一篇文章")
  .max(ADMIN_POSTS_PAGE_SIZE, `一次最多刪除 ${ADMIN_POSTS_PAGE_SIZE} 篇文章`)
  .transform((ids) => [...new Set(ids)])

export async function deletePostsAction(
  _prevState: DeletePostsState,
  formData: FormData,
): Promise<DeletePostsState> {
  await requireAdmin()

  const parsed = deletePostIdsSchema.safeParse(formData.getAll(DELETE_POSTS_FIELD))
  if (!parsed.success) return createErrorState(parsed.error.issues[0].message)

  const supabase = await createClient()
  const { data, error } = await supabase.from("posts").delete().in("id", parsed.data).select("id")

  if (error) return createErrorState("刪除失敗，請稍後再試")
  if (data.length === 0) return createErrorState("找不到選取的文章，可能已被刪除")

  revalidatePostPaths()

  return createSuccessState(data.length === 1 ? "文章已刪除" : `已刪除 ${data.length} 篇文章`)
}

export type SlugAvailability = {
  available: boolean
  // 被占用時回傳占用者的標題，方便判斷要改哪一篇
  conflictTitle?: string
}

const slugCheckSchema = z.object({
  slug: z.string().max(SLUG_MAX_LENGTH).regex(SLUG_PATTERN),
  excludeId: z.uuid().optional(),
})

// 編輯時即時檢查網址代稱是否已被其他文章使用；資料庫的唯一限制仍是最終防線
// 格式不正確或查詢失敗時回傳 null，由表單顯示格式錯誤或略過提示，存檔時資料庫會再檢查一次
export async function checkPostSlugAction(
  slug: string,
  excludeId?: string,
): Promise<SlugAvailability | null> {
  await requireAdmin()

  const parsed = slugCheckSchema.safeParse({ slug, excludeId })
  if (!parsed.success) return null

  const supabase = await createClient()
  let query = supabase.from("posts").select("title").eq("slug", parsed.data.slug)
  if (parsed.data.excludeId) query = query.neq("id", parsed.data.excludeId)

  const { data, error } = await query.maybeSingle()

  if (error) return null
  if (!data) return { available: true }

  return { available: false, conflictTitle: data.title }
}
