import "server-only"

import type { ContentStatus } from "@/lib/constants/content"
import { CATEGORY_WITH_PARENT_SELECT, type CategoryRelation } from "@/lib/data/categories"
import { createClient } from "@/lib/supabase/server"

export type AdminProjectListItem = {
  id: string
  title: string
  slug: string
  status: ContentStatus
  isFeatured: boolean
  coverImageUrl: string | null
  techStack: string[]
  updatedAt: string
  categoryName: string | null
  parentCategoryName: string | null
}

export type EditableProject = {
  id: string
  title: string
  slug: string
  summary: string
  demoUrl: string | null
  repoUrl: string | null
  techStack: string[]
  categoryId: string | null
  coverImageUrl: string | null
  isFeatured: boolean
  status: ContentStatus
}

// 作品數量有限，後台一次取出全部；排序規則需與前台 public-projects 及排序動作一致：
// sort_order 越小越前面，同序時依建立時間與 id，確保順序穩定
export async function listAdminProjects(): Promise<AdminProjectListItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("projects")
    .select(
      `id, title, slug, status, is_featured, cover_image_url, tech_stack, updated_at, ${CATEGORY_WITH_PARENT_SELECT}`,
    )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .overrideTypes<Array<{ category: CategoryRelation }>, { merge: true }>()

  if (error) throw new Error(`讀取作品列表失敗：${error.message}`)

  return data.map((project) => ({
    id: project.id,
    title: project.title,
    slug: project.slug,
    status: project.status,
    isFeatured: project.is_featured,
    coverImageUrl: project.cover_image_url,
    techStack: project.tech_stack,
    updatedAt: project.updated_at,
    categoryName: project.category?.name ?? null,
    parentCategoryName: project.category?.parent?.name ?? null,
  }))
}

export async function getEditableProject(id: string): Promise<EditableProject | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("projects")
    .select(
      "id, title, slug, summary, demo_url, repo_url, tech_stack, category_id, cover_image_url, is_featured, status",
    )
    .eq("id", id)
    .maybeSingle()

  if (error) throw new Error(`讀取作品失敗：${error.message}`)
  if (!data) return null

  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    summary: data.summary,
    demoUrl: data.demo_url,
    repoUrl: data.repo_url,
    techStack: data.tech_stack,
    categoryId: data.category_id,
    coverImageUrl: data.cover_image_url,
    isFeatured: data.is_featured,
    status: data.status,
  }
}
