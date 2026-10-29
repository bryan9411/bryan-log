"use server"

import { revalidatePath, updateTag } from "next/cache"
import { z } from "zod"

import { ROUTE_PATTERN, ROUTES } from "@/config/routes"
import {
  createErrorState,
  createSuccessState,
  toFieldErrors,
  type ActionState,
} from "@/lib/actions/action-state"
import { requireAdmin } from "@/lib/auth/session"
import { CACHE_TAG } from "@/lib/cache-tags"
import { createClient } from "@/lib/supabase/server"
import { SECTION_FIELDS, sectionFormSchema, type SectionField } from "@/lib/validations/section"

export type SectionFormState = ActionState<SectionField> & {
  // 新增成功時回傳新區塊的 id，讓文章分類頁直接切換到新頁籤
  sectionId?: string
}
export type DeleteSectionState = ActionState

const POSTGRES_ERROR = {
  UNIQUE_VIOLATION: "23505",
  FOREIGN_KEY_VIOLATION: "23503",
  CHECK_VIOLATION: "23514",
} as const

// 唯一索引名稱，用來判斷是名稱還是網址代稱重複
const UNIQUE_INDEX = {
  NAME: "sections_name_key",
} as const

const MESSAGE = {
  GENERIC_SAVE_ERROR: "儲存失敗，請稍後再試",
  NOT_FOUND: "找不到這個區塊，可能已被刪除",
  IN_USE: "此區塊底下仍有文章或分類，請先刪除或移到其他區塊",
} as const

type DatabaseError = { code?: string; message: string }

function mapDatabaseError(error: DatabaseError): SectionFormState {
  switch (error.code) {
    case POSTGRES_ERROR.UNIQUE_VIOLATION:
      if (error.message.includes(UNIQUE_INDEX.NAME)) {
        return createErrorState("區塊名稱重複", {
          fieldErrors: { name: ["已有同名的區塊，請換一個名稱"] },
        })
      }
      return createErrorState("網址代稱重複", {
        fieldErrors: { slug: ["其他區塊已使用此網址代稱，請換一個"] },
      })
    case POSTGRES_ERROR.CHECK_VIOLATION:
      return createErrorState("網址代稱不可使用", {
        fieldErrors: { slug: ["此網址代稱為系統保留字或格式不正確，請換一個"] },
      })
    default:
      return createErrorState(MESSAGE.GENERIC_SAVE_ERROR)
  }
}

// 區塊名稱出現在導覽列、首頁、列表頁與每篇文章的麵包屑，因此前台相關快取全部失效
function revalidateSectionPaths() {
  updateTag(CACHE_TAG.SECTIONS)
  updateTag(CACHE_TAG.POSTS)
  revalidatePath(ROUTES.HOME)
  revalidatePath(ROUTE_PATTERN.SECTION, "page")
  revalidatePath(ROUTE_PATTERN.POST_DETAIL, "page")
  revalidatePath(ROUTES.ADMIN_POST_CATEGORIES)
  revalidatePath(ROUTES.ADMIN_POSTS)
}

function readSectionForm(formData: FormData) {
  return Object.fromEntries(SECTION_FIELDS.map((field) => [field, formData.get(field)]))
}

export async function saveSectionAction(
  _prevState: SectionFormState,
  formData: FormData,
): Promise<SectionFormState> {
  await requireAdmin()

  const parsed = sectionFormSchema.safeParse(readSectionForm(formData))

  if (!parsed.success) {
    return createErrorState("請修正標示的欄位後再送出", {
      fieldErrors: toFieldErrors<SectionField>(parsed.error),
    })
  }

  const { id, name, slug, description, coverImageUrl, sortOrder } = parsed.data
  const record = {
    name,
    slug,
    description: description || null,
    cover_image_url: coverImageUrl ?? null,
    sort_order: sortOrder,
  }

  const supabase = await createClient()

  if (!id) {
    const { data, error } = await supabase.from("sections").insert(record).select("id").single()
    if (error) return mapDatabaseError(error)

    revalidateSectionPaths()
    return { ...createSuccessState<SectionField>(`已新增區塊「${name}」`), sectionId: data.id }
  }

  const { data, error } = await supabase
    .from("sections")
    .update(record)
    .eq("id", id)
    .select("id")
    .maybeSingle()

  if (error) return mapDatabaseError(error)
  if (!data) return createErrorState(MESSAGE.NOT_FOUND)

  revalidateSectionPaths()
  return createSuccessState(`已更新區塊「${name}」`)
}

// 文章與分類的 section_id 外鍵皆為 on delete restrict：先檢查並回傳清楚的訊息，資料庫仍會再擋一次
export async function deleteSectionAction(
  _prevState: DeleteSectionState,
  formData: FormData,
): Promise<DeleteSectionState> {
  await requireAdmin()

  const parsed = z.uuid().safeParse(formData.get("id"))
  if (!parsed.success) return createErrorState("區塊識別碼不正確")

  const supabase = await createClient()
  const countOnly = { count: "exact", head: true } as const

  const [posts, categories] = await Promise.all([
    supabase.from("posts").select("id", countOnly).eq("section_id", parsed.data),
    supabase.from("categories").select("id", countOnly).eq("section_id", parsed.data),
  ])

  if (posts.error || categories.error) return createErrorState("刪除失敗，請稍後再試")
  if (posts.count || categories.count) return createErrorState(MESSAGE.IN_USE)

  const { data, error } = await supabase
    .from("sections")
    .delete()
    .eq("id", parsed.data)
    .select("name")
    .maybeSingle()

  if (error?.code === POSTGRES_ERROR.FOREIGN_KEY_VIOLATION) return createErrorState(MESSAGE.IN_USE)
  if (error) return createErrorState("刪除失敗，請稍後再試")
  if (!data) return createErrorState(MESSAGE.NOT_FOUND)

  revalidateSectionPaths()
  return createSuccessState(`已刪除區塊「${data.name}」`)
}
