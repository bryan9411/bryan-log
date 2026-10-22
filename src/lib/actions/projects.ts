"use server"

import { revalidatePath, updateTag } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import {
  adminEditProjectRoute,
  POST_CREATED_PARAM,
  projectDetailPath,
  ROUTES,
} from "@/config/routes"
import {
  createErrorState,
  createSuccessState,
  toFieldErrors,
  type ActionState,
} from "@/lib/actions/action-state"
import { requireAdmin } from "@/lib/auth/session"
import { CACHE_TAG } from "@/lib/cache-tags"
import { CONTENT_STATUS } from "@/lib/constants/content"
import { createClient } from "@/lib/supabase/server"
import {
  PROJECT_FIELDS,
  PROJECT_INTENT,
  projectFormSchema,
  TECH_STACK_FIELD,
  type ProjectField,
} from "@/lib/validations/project"

export type ProjectFormState = ActionState<ProjectField> & {
  // 每次成功存檔都會更新，供客戶端重設「未儲存」狀態
  savedAt?: number
}

const POSTGRES_ERROR = {
  UNIQUE_VIOLATION: "23505",
  FOREIGN_KEY_VIOLATION: "23503",
  RAISE_EXCEPTION: "P0001",
} as const

type DatabaseError = { code?: string; message: string }

function mapDatabaseError(error: DatabaseError): ProjectFormState {
  switch (error.code) {
    case POSTGRES_ERROR.UNIQUE_VIOLATION:
      return createErrorState("網址代稱重複", {
        fieldErrors: { slug: ["此網址代稱已被其他作品使用，請換一個"] },
      })
    case POSTGRES_ERROR.FOREIGN_KEY_VIOLATION:
      return createErrorState("分類不存在", {
        fieldErrors: { categoryId: ["所選分類已被刪除，請重新選擇"] },
      })
    case POSTGRES_ERROR.RAISE_EXCEPTION:
      // 資料庫觸發器拋出的訊息本身即為繁體中文（例如分類類型不符）
      return createErrorState(error.message)
    default:
      return createErrorState("儲存失敗，請稍後再試")
  }
}

// 首頁精選區、作品列表與作品內頁都可能顯示這個作品，異動後一併讓快取失效
function revalidateProjectPaths(slugs: string[]) {
  updateTag(CACHE_TAG.PROJECTS)
  revalidatePath(ROUTES.HOME)
  revalidatePath(ROUTES.PROJECTS)
  revalidatePath(ROUTES.ADMIN_PROJECTS)
  revalidatePath(ROUTES.ADMIN_DASHBOARD)
  new Set(slugs).forEach((slug) => revalidatePath(projectDetailPath(slug)))
}

function readProjectForm(formData: FormData) {
  return Object.fromEntries(
    PROJECT_FIELDS.map((field) => [
      field,
      field === TECH_STACK_FIELD ? formData.getAll(field) : formData.get(field),
    ]),
  )
}

export async function saveProjectAction(
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  await requireAdmin()

  const parsed = projectFormSchema.safeParse(readProjectForm(formData))

  if (!parsed.success) {
    return createErrorState("請修正標示的欄位後再送出", {
      fieldErrors: toFieldErrors<ProjectField>(parsed.error),
    })
  }

  const { id, intent, ...fields } = parsed.data
  const isPublishing = intent === PROJECT_INTENT.publish

  // 專案詳細介紹（description_html）不在此表單中編輯，更新時保留原值
  const record = {
    title: fields.title,
    slug: fields.slug,
    summary: fields.summary,
    demo_url: fields.demoUrl ?? null,
    repo_url: fields.repoUrl ?? null,
    tech_stack: fields.techStack,
    category_id: fields.categoryId ?? null,
    cover_image_url: fields.coverImageUrl ?? null,
    is_featured: fields.isFeatured,
    status: isPublishing ? CONTENT_STATUS.PUBLISHED : CONTENT_STATUS.DRAFT,
  }

  const supabase = await createClient()

  if (!id) {
    const { data, error } = await supabase.from("projects").insert(record).select("id").single()

    if (error) return mapDatabaseError(error)

    revalidateProjectPaths([fields.slug])
    // 建立後轉往編輯頁，之後的存檔都會更新同一筆資料，避免重複新增
    redirect(`${adminEditProjectRoute(data.id)}?${POST_CREATED_PARAM}=${intent}`)
  }

  const { data: previous } = await supabase
    .from("projects")
    .select("slug")
    .eq("id", id)
    .maybeSingle()

  if (!previous) return createErrorState("找不到這個作品，可能已被刪除")

  const { error } = await supabase.from("projects").update(record).eq("id", id)

  if (error) return mapDatabaseError(error)

  revalidateProjectPaths([previous.slug, fields.slug])

  return {
    ...createSuccessState<ProjectField>(
      isPublishing ? "作品已發布，前台內容已即時更新" : "草稿已儲存",
    ),
    savedAt: Date.now(),
  }
}

export type DeleteProjectState = ActionState

export async function deleteProjectAction(
  _prevState: DeleteProjectState,
  formData: FormData,
): Promise<DeleteProjectState> {
  await requireAdmin()

  const parsed = z.uuid().safeParse(formData.get("id"))
  if (!parsed.success) return createErrorState("作品識別碼不正確")

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("projects")
    .delete()
    .eq("id", parsed.data)
    .select("slug")
    .maybeSingle()

  if (error) return createErrorState("刪除失敗，請稍後再試")
  if (!data) return createErrorState("找不到這個作品，可能已被刪除")

  revalidateProjectPaths([data.slug])

  return createSuccessState("作品已刪除")
}

const featuredToggleSchema = z.object({
  id: z.uuid("作品識別碼不正確"),
  isFeatured: z.boolean(),
})

// 列表上的精選開關直接呼叫，不經過表單
export async function setProjectFeaturedAction(
  id: string,
  isFeatured: boolean,
): Promise<ActionState> {
  await requireAdmin()

  const parsed = featuredToggleSchema.safeParse({ id, isFeatured })
  if (!parsed.success) return createErrorState(parsed.error.issues[0].message)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("projects")
    .update({ is_featured: parsed.data.isFeatured })
    .eq("id", parsed.data.id)
    .select("slug")
    .maybeSingle()

  if (error) return createErrorState("更新精選狀態失敗，請稍後再試")
  if (!data) return createErrorState("找不到這個作品，可能已被刪除")

  revalidateProjectPaths([data.slug])

  return createSuccessState(parsed.data.isFeatured ? "已設為精選作品" : "已取消精選")
}
