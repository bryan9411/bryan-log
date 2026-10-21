import "server-only"

import type { CategoryType } from "@/lib/constants/content"
import { createClient } from "@/lib/supabase/server"

// 分類為兩層結構：以自我關聯取出父分類名稱，外鍵別名必須寫成 parent:parent_id
export const CATEGORY_WITH_PARENT_SELECT = "category:categories(name, parent:parent_id(name))"

export type CategoryRelation = { name: string; parent: { name: string } | null } | null

export type CategoryOption = {
  id: string
  name: string
}

export type CategoryTreeNode = CategoryOption & {
  children: CategoryOption[]
}

// 將扁平的分類資料組成「父分類 → 子分類」兩層結構，供聯動下拉選單使用
export async function getCategoryTree(type: CategoryType): Promise<CategoryTreeNode[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, parent_id")
    .eq("type", type)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })

  if (error) throw new Error(`讀取分類失敗：${error.message}`)

  const parents = data.filter((category) => category.parent_id === null)

  return parents.map((parent) => ({
    id: parent.id,
    name: parent.name,
    children: data
      .filter((category) => category.parent_id === parent.id)
      .map(({ id, name }) => ({ id, name })),
  }))
}
