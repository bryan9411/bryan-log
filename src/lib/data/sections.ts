import "server-only"

import { cacheLife, cacheTag } from "next/cache"

import { CACHE_TAG } from "@/lib/cache-tags"
import { createClient } from "@/lib/supabase/server"
import { createPublicClient } from "@/lib/supabase/public"

export type Section = {
  id: string
  name: string
  slug: string
  description: string | null
}

export type AdminSection = Section & {
  sortOrder: number
  // 含草稿；有文章或分類的區塊不可刪除
  postCount: number
  categoryCount: number
}

export const SECTION_RELATION_SELECT = "section:sections(name, slug)"

export type SectionRef = { name: string; slug: string }

const SECTION_COLUMNS = "id, name, slug, description"

// 導覽列、首頁與列表頁共用；區塊為公開資訊，以公開 Client 查詢並跨請求快取
export async function getSections(): Promise<Section[]> {
  "use cache"
  cacheLife("days")
  cacheTag(CACHE_TAG.SECTIONS)

  const { data, error } = await createPublicClient()
    .from("sections")
    .select(SECTION_COLUMNS)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })

  if (error) throw new Error(`讀取內容區塊失敗：${error.message}`)

  return data
}

export async function getSectionBySlug(slug: string): Promise<Section | null> {
  const sections = await getSections()
  return sections.find((section) => section.slug === slug) ?? null
}

type CountRelation = Array<{ count: number }>

// 後台需要即時的文章與分類數量，因此不快取
export async function getAdminSections(): Promise<AdminSection[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("sections")
    .select(`${SECTION_COLUMNS}, sort_order, posts(count), categories(count)`)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .overrideTypes<Array<{ posts: CountRelation; categories: CountRelation }>, { merge: true }>()

  if (error) throw new Error(`讀取內容區塊失敗：${error.message}`)

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    sortOrder: row.sort_order,
    postCount: row.posts[0]?.count ?? 0,
    categoryCount: row.categories[0]?.count ?? 0,
  }))
}
