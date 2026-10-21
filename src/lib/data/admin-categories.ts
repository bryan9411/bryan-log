import "server-only"

import { CATEGORY_TYPE, type CategoryType } from "@/lib/constants/content"
import { createClient } from "@/lib/supabase/server"

export type AdminCategory = {
  id: string
  type: CategoryType
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

export type AdminCategoryTrees = Record<CategoryType, AdminCategoryNode[]>

type CountRelation = Array<{ count: number }>

// 以 PostgREST 的關聯計數一次取得每個分類的文章與作品數量；後台需即時數字，因此不快取
export async function getAdminCategoryTrees(): Promise<AdminCategoryTrees> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("categories")
    .select(
      "id, type, name, slug, description, sort_order, parent_id, posts(count), projects(count)",
    )
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .overrideTypes<Array<{ posts: CountRelation; projects: CountRelation }>, { merge: true }>()

  if (error) throw new Error(`讀取分類失敗：${error.message}`)

  const categories: AdminCategory[] = data.map((row) => ({
    id: row.id,
    type: row.type,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    sortOrder: row.sort_order,
    parentId: row.parent_id,
    contentCount:
      row.type === CATEGORY_TYPE.POST ? (row.posts[0]?.count ?? 0) : (row.projects[0]?.count ?? 0),
  }))

  const buildTree = (type: CategoryType): AdminCategoryNode[] =>
    categories
      .filter((category) => category.type === type && category.parentId === null)
      .map((parent) => ({
        ...parent,
        children: categories.filter((category) => category.parentId === parent.id),
      }))

  return {
    [CATEGORY_TYPE.POST]: buildTree(CATEGORY_TYPE.POST),
    [CATEGORY_TYPE.PROJECT]: buildTree(CATEGORY_TYPE.PROJECT),
  }
}
