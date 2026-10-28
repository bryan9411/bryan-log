import "server-only"

import { cacheLife, cacheTag } from "next/cache"

import { CACHE_TAG } from "@/lib/cache-tags"
import { CATEGORY_TYPE, type CategoryType } from "@/lib/constants/content"
import type { CategoryOption, CategoryRef, CategoryTreeNode } from "@/lib/content/category-filter"
import { createPublicClient } from "@/lib/supabase/public"

// 分類為兩層結構：以自我關聯取出父分類，外鍵別名必須寫成 parent:parent_id
export const CATEGORY_WITH_PARENT_SELECT =
  "category:categories(name, slug, parent:parent_id(name, slug))"

export type CategoryRelation = (CategoryRef & { parent: CategoryRef | null }) | null

export type { CategoryOption, CategoryTreeNode }

// 拆出文章／作品關聯中的分類與父分類，前台篩選與顯示共用
export function splitCategoryRelation(relation: CategoryRelation) {
  return {
    category: relation ? { name: relation.name, slug: relation.slug } : null,
    parentCategory: relation?.parent ?? null,
  }
}

type CategoryRow = {
  id: string
  name: string
  slug: string
  parent_id: string | null
  type: CategoryType
  section_id: string | null
}

// 分類對匿名訪客公開，因此以公開 Client 查詢並跨請求快取；各區塊與作品集的分類樹都由這份資料組成
async function getAllCategories(): Promise<CategoryRow[]> {
  "use cache"
  cacheLife("days")
  cacheTag(CACHE_TAG.CATEGORIES)

  const { data, error } = await createPublicClient()
    .from("categories")
    .select("id, name, slug, parent_id, type, section_id")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })

  if (error) throw new Error(`讀取分類失敗：${error.message}`)

  return data
}

// 將扁平的分類資料組成「父分類 → 子分類」兩層結構，供後台聯動下拉選單與前台篩選按鈕共用
function buildTree(rows: CategoryRow[]): CategoryTreeNode[] {
  const toOption = ({ id, name, slug }: CategoryRow): CategoryOption => ({ id, name, slug })

  return rows
    .filter((category) => category.parent_id === null)
    .map((parent) => ({
      ...toOption(parent),
      children: rows.filter((category) => category.parent_id === parent.id).map(toOption),
    }))
}

export async function getProjectCategoryTree(): Promise<CategoryTreeNode[]> {
  const rows = await getAllCategories()
  return buildTree(rows.filter((row) => row.type === CATEGORY_TYPE.PROJECT))
}

export async function getSectionCategoryTree(sectionId: string): Promise<CategoryTreeNode[]> {
  const rows = await getAllCategories()
  return buildTree(rows.filter((row) => row.section_id === sectionId))
}

// 後台文章表單切換區塊時，分類選單需立即換成該區塊的分類，因此一次取回所有區塊的分類樹
export async function getCategoryTreesBySection(): Promise<Record<string, CategoryTreeNode[]>> {
  const rows = await getAllCategories()
  const sectionIds = new Set(rows.flatMap((row) => (row.section_id ? [row.section_id] : [])))

  return Object.fromEntries(
    [...sectionIds].map((sectionId) => [
      sectionId,
      buildTree(rows.filter((row) => row.section_id === sectionId)),
    ]),
  )
}
