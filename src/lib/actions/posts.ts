"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { adminEditPostRoute, POST_CREATED_PARAM, postDetailPath, ROUTES } from "@/config/routes"
import {
  createErrorState,
  createSuccessState,
  toFieldErrors,
  type ActionState,
} from "@/lib/actions/action-state"
import { requireAdmin } from "@/lib/auth/session"
import { CONTENT_STATUS } from "@/lib/constants/content"
import { ContentValidationError, renderPostContent } from "@/lib/content/render-post"
import { createClient } from "@/lib/supabase/server"
import { POST_FIELDS, POST_INTENT, postFormSchema, type PostField } from "@/lib/validations/post"

export type PostFormState = ActionState<PostField> & {
  // 每次成功存檔都會更新，供客戶端判斷是否需要清除本機暫存
  savedAt?: number
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
      return createErrorState("分類不存在", {
        fieldErrors: { categoryId: ["所選分類已被刪除，請重新選擇"] },
      })
    case POSTGRES_ERROR.RAISE_EXCEPTION:
      // 資料庫觸發器拋出的訊息本身即為繁體中文（例如分類類型不符）
      return createErrorState(error.message)
    default:
      return createErrorState(GENERIC_SAVE_ERROR)
  }
}

// 首頁、文章列表與文章內頁都可能顯示這篇文章，發布或修改後一併讓快取失效
function revalidatePostPaths(slugs: string[]) {
  revalidatePath(ROUTES.HOME)
  revalidatePath(ROUTES.POSTS)
  revalidatePath(ROUTES.ADMIN_POSTS)
  revalidatePath(ROUTES.ADMIN_DASHBOARD)
  new Set(slugs).forEach((slug) => revalidatePath(postDetailPath(slug)))
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

  const { id, title, slug, excerpt, categoryId, coverImageUrl, contentJson, intent } = parsed.data
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

  const record = {
    title,
    slug,
    excerpt: excerpt || rendered.excerpt || null,
    category_id: categoryId ?? null,
    cover_image_url: coverImageUrl ?? null,
    content_json: rendered.json,
    content_html: rendered.html,
    reading_time_minutes: rendered.readingMinutes,
    status: isPublishing ? CONTENT_STATUS.PUBLISHED : CONTENT_STATUS.DRAFT,
  }

  const supabase = await createClient()

  if (!id) {
    const { data, error } = await supabase.from("posts").insert(record).select("id").single()

    if (error) return mapDatabaseError(error)

    revalidatePostPaths([slug])
    // 新文章建立後轉往編輯頁，之後的存檔都會更新同一筆資料，避免重複新增
    redirect(`${adminEditPostRoute(data.id)}?${POST_CREATED_PARAM}=${intent}`)
  }

  const { data: previous } = await supabase.from("posts").select("slug").eq("id", id).maybeSingle()

  if (!previous) {
    return createErrorState("找不到這篇文章，可能已被刪除")
  }

  const { error } = await supabase.from("posts").update(record).eq("id", id)

  if (error) return mapDatabaseError(error)

  revalidatePostPaths([previous.slug, slug])

  return {
    ...createSuccessState<PostField>(
      isPublishing ? "文章已發布，前台內容已即時更新" : "草稿已儲存",
    ),
    savedAt: Date.now(),
  }
}

export type DeletePostState = ActionState

export async function deletePostAction(
  _prevState: DeletePostState,
  formData: FormData,
): Promise<DeletePostState> {
  await requireAdmin()

  const parsed = z.uuid().safeParse(formData.get("id"))
  if (!parsed.success) return createErrorState("文章識別碼不正確")

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("posts")
    .delete()
    .eq("id", parsed.data)
    .select("slug")
    .maybeSingle()

  if (error) return createErrorState("刪除失敗，請稍後再試")
  if (!data) return createErrorState("找不到這篇文章，可能已被刪除")

  revalidatePostPaths([data.slug])

  return createSuccessState("文章已刪除")
}
