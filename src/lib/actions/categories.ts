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
import { CATEGORY_TYPE } from "@/lib/constants/content"
import { createClient } from "@/lib/supabase/server"
import { CATEGORY_FIELDS, categoryFormSchema, type CategoryField } from "@/lib/validations/category"

export type CategoryFormState = ActionState<CategoryField>
export type DeleteCategoryState = ActionState

const POSTGRES_ERROR = {
  UNIQUE_VIOLATION: "23505",
  FOREIGN_KEY_VIOLATION: "23503",
  RAISE_EXCEPTION: "P0001",
} as const

// 唯一索引名稱，用來判斷是名稱還是網址代稱重複（定義於 supabase_schema.sql）
const UNIQUE_INDEX = {
  SIBLING_NAME: "categories_sibling_name_key",
} as const

const MESSAGE = {
  GENERIC_SAVE_ERROR: "儲存失敗，請稍後再試",
  NOT_FOUND: "找不到這個分類，可能已被刪除",
  HAS_CHILDREN: "此分類底下仍有子分類，請先移除或轉移子分類",
} as const

type DatabaseError = { code?: string; message: string }

function mapDatabaseError(error: DatabaseError): CategoryFormState {
  switch (error.code) {
    case POSTGRES_ERROR.UNIQUE_VIOLATION:
      if (error.message.includes(UNIQUE_INDEX.SIBLING_NAME)) {
        return createErrorState("分類名稱重複", {
          fieldErrors: { name: ["同一層已有同名的分類，請換一個名稱（不同父分類底下可以同名）"] },
        })
      }
      return createErrorState("網址代稱重複", {
        fieldErrors: { slug: ["同一個區塊內已有分類使用此網址代稱，請換一個"] },
      })
    case POSTGRES_ERROR.FOREIGN_KEY_VIOLATION:
      return createErrorState("父分類不存在", {
        fieldErrors: { parentId: ["所選父分類已被刪除，請重新選擇"] },
      })
    case POSTGRES_ERROR.RAISE_EXCEPTION:
      // 觸發器 enforce_category_hierarchy 拋出的訊息本身即為繁體中文
      return createErrorState(error.message, { fieldErrors: { parentId: [error.message] } })
    default:
      return createErrorState(MESSAGE.GENERIC_SAVE_ERROR)
  }
}

// 分類名稱同時出現在前台篩選器、文章卡片與文章內頁，三種快取標籤與相關頁面一併失效
function revalidateCategoryPaths() {
  updateTag(CACHE_TAG.CATEGORIES)
  updateTag(CACHE_TAG.POSTS)
  updateTag(CACHE_TAG.PROJECTS)
  revalidatePath(ROUTES.HOME)
  revalidatePath(ROUTE_PATTERN.SECTION, "page")
  revalidatePath(ROUTE_PATTERN.POST_DETAIL, "page")
  revalidatePath(ROUTES.PROJECTS)
  revalidatePath(ROUTES.ADMIN_POST_CATEGORIES)
  revalidatePath(ROUTES.ADMIN_PROJECT_CATEGORIES)
  revalidatePath(ROUTES.ADMIN_POSTS)
}

function readCategoryForm(formData: FormData) {
  return Object.fromEntries(CATEGORY_FIELDS.map((field) => [field, formData.get(field)]))
}

type Supabase = Awaited<ReturnType<typeof createClient>>

// 縱深防禦：資料庫觸發器之外，先在伺服器端檢查兩層階層規則，回傳更精準的欄位錯誤
async function validateHierarchy(
  supabase: Supabase,
  {
    id,
    type,
    sectionId,
    parentId,
  }: { id?: string; type: string; sectionId: string | null; parentId?: string },
): Promise<CategoryFormState | null> {
  if (!parentId) return null

  if (parentId === id) {
    return createErrorState("父分類設定錯誤", {
      fieldErrors: { parentId: ["分類不可設定自己為父分類"] },
    })
  }

  const { data: parent } = await supabase
    .from("categories")
    .select("type, section_id, parent_id")
    .eq("id", parentId)
    .maybeSingle()

  if (!parent) {
    return createErrorState("父分類不存在", {
      fieldErrors: { parentId: ["所選父分類已被刪除，請重新選擇"] },
    })
  }

  if (parent.type !== type || parent.section_id !== sectionId) {
    return createErrorState("父分類不符", {
      fieldErrors: { parentId: ["父分類必須與此分類屬於同一個區塊"] },
    })
  }

  if (parent.parent_id !== null) {
    return createErrorState("分類最多只能兩層", {
      fieldErrors: { parentId: ["所選分類本身已是子分類，不能再作為父分類"] },
    })
  }

  if (id) {
    const { count } = await supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", id)

    if (count) {
      return createErrorState("分類最多只能兩層", {
        fieldErrors: { parentId: ["此分類底下已有子分類，無法再設為其他分類的子分類"] },
      })
    }
  }

  return null
}

export async function saveCategoryAction(
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireAdmin()

  const parsed = categoryFormSchema.safeParse(readCategoryForm(formData))

  if (!parsed.success) {
    return createErrorState("請修正標示的欄位後再送出", {
      fieldErrors: toFieldErrors<CategoryField>(parsed.error),
    })
  }

  const { id, type, name, slug, parentId, description, sortOrder } = parsed.data
  // 文章分類一定隸屬某個區塊，作品分類則不屬於任何區塊（與資料庫 check constraint 一致）
  const sectionId = type === CATEGORY_TYPE.POST ? (parsed.data.sectionId ?? null) : null

  if (type === CATEGORY_TYPE.POST && !sectionId) {
    return createErrorState("找不到所屬區塊，請重新整理頁面後再試")
  }

  const supabase = await createClient()

  const hierarchyError = await validateHierarchy(supabase, { id, type, sectionId, parentId })
  if (hierarchyError) return hierarchyError

  const record = {
    name,
    slug,
    parent_id: parentId ?? null,
    description: description || null,
    sort_order: sortOrder,
  }

  if (!id) {
    const { error } = await supabase
      .from("categories")
      .insert({ ...record, type, section_id: sectionId })
    if (error) return mapDatabaseError(error)

    revalidateCategoryPaths()
    return createSuccessState(`已新增分類「${name}」`)
  }

  // 類型與區塊建立後即固定：更新時刻意不寫入，並以條件確保不會改到其他區塊的分類
  const query = supabase.from("categories").update(record).eq("id", id).eq("type", type)
  const { data, error } = await (
    sectionId ? query.eq("section_id", sectionId) : query.is("section_id", null)
  )
    .select("id")
    .maybeSingle()

  if (error) return mapDatabaseError(error)
  if (!data) return createErrorState(MESSAGE.NOT_FOUND)

  revalidateCategoryPaths()
  return createSuccessState(`已更新分類「${name}」`)
}

// 文章與作品的 category_id 外鍵設定為 on delete set null，刪除後關聯內容會自動變為未分類；
// 子分類的 parent_id 外鍵為 on delete restrict，即使略過下方檢查，資料庫也會拒絕刪除
export async function deleteCategoryAction(
  _prevState: DeleteCategoryState,
  formData: FormData,
): Promise<DeleteCategoryState> {
  await requireAdmin()

  const parsed = z.uuid().safeParse(formData.get("id"))
  if (!parsed.success) return createErrorState("分類識別碼不正確")

  const supabase = await createClient()

  const { count: childCount, error: countError } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", parsed.data)

  if (countError) return createErrorState("刪除失敗，請稍後再試")
  if (childCount) return createErrorState(MESSAGE.HAS_CHILDREN)

  const { data, error } = await supabase
    .from("categories")
    .delete()
    .eq("id", parsed.data)
    .select("name")
    .maybeSingle()

  if (error?.code === POSTGRES_ERROR.FOREIGN_KEY_VIOLATION) {
    return createErrorState(MESSAGE.HAS_CHILDREN)
  }
  if (error) return createErrorState("刪除失敗，請稍後再試")
  if (!data) return createErrorState(MESSAGE.NOT_FOUND)

  revalidateCategoryPaths()
  return createSuccessState(`已刪除分類「${data.name}」`)
}
