import "server-only"

import { CATEGORY_TYPE, type CategoryType } from "@/lib/constants/content"
import { getAdminSections, type AdminSection } from "@/lib/data/sections"
import { createClient } from "@/lib/supabase/server"

export type AdminCategory = {
  id: string
  type: CategoryType
  sectionId: string | null
  name: string
  slug: string
  description: string
  sortOrder: number
  parentId: string | null
  // 直接歸屬此分類的文章或作品數（含草稿），不含子分類的內容
  contentCount: number
}

export type AdminCategoryNode = AdminCategory & {
  children: AdminCategory[]
}

// 文章分類頁的一個頁籤：一個內容區塊與它底下的分類樹
export type AdminSectionCategoryGroup = {
  section: AdminSection
  nodes: AdminCategoryNode[]
}

type CountRelation = Array<{ count: number }>

// 以 PostgREST 的關聯計數一次取得每個分類的文章或作品數量；後台需即時數字，因此不快取
async function listAdminCategories(type: CategoryType): Promise<AdminCategory[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("categories")
    .select(
      "id, type, section_id, name, slug, description, sort_order, parent_id, posts(count), projects(count)",
    )
    .eq("type", type)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .overrideTypes<Array<{ posts: CountRelation; projects: CountRelation }>, { merge: true }>()

  if (error) throw new Error(`讀取分類失敗：${error.message}`)

  return data.map((row) => ({
    id: row.id,
    type: row.type,
    sectionId: row.section_id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    sortOrder: row.sort_order,
    parentId: row.parent_id,
    contentCount:
      row.type === CATEGORY_TYPE.POST ? (row.posts[0]?.count ?? 0) : (row.projects[0]?.count ?? 0),
  }))
}

function buildTree(categories: AdminCategory[]): AdminCategoryNode[] {
  return categories
    .filter((category) => category.parentId === null)
    .map((parent) => ({
      ...parent,
      children: categories.filter((category) => category.parentId === parent.id),
    }))
}

export async function getAdminSectionCategoryGroups(): Promise<AdminSectionCategoryGroup[]> {
  const [sections, categories] = await Promise.all([
    getAdminSections(),
    listAdminCategories(CATEGORY_TYPE.POST),
  ])

  return sections.map((section) => ({
    section,
    nodes: buildTree(categories.filter((category) => category.sectionId === section.id)),
  }))
}

export async function getAdminProjectCategoryTree(): Promise<AdminCategoryNode[]> {
  return buildTree(await listAdminCategories(CATEGORY_TYPE.PROJECT))
}

// 儀表板分類占比使用：所有區塊的文章分類合併為一組；有多個區塊時名稱前加上區塊，避免同名分類混淆
export async function getAdminCategoryTrees(): Promise<Record<CategoryType, AdminCategoryNode[]>> {
  const [groups, projectNodes] = await Promise.all([
    getAdminSectionCategoryGroups(),
    getAdminProjectCategoryTree(),
  ])
  const showSection = groups.length > 1

  return {
    [CATEGORY_TYPE.POST]: groups.flatMap(({ section, nodes }) =>
      nodes.map((node) =>
        showSection ? { ...node, name: `${section.name}／${node.name}` } : node,
      ),
    ),
    [CATEGORY_TYPE.PROJECT]: projectNodes,
  }
}
