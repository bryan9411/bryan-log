import "server-only"

import { CATEGORY_TYPE, CONTENT_STATUS, type CategoryType } from "@/lib/constants/content"
import { getAdminCategoryTrees } from "@/lib/data/admin-categories"
import { createClient } from "@/lib/supabase/server"

export type ContentStats = {
  totalPosts: number
  publishedPosts: number
  draftPosts: number
  totalProjects: number
  featuredProjects: number
}

// head: true 只回傳筆數不傳輸資料列，五個查詢並行以縮短等待時間
export async function getContentStats(): Promise<ContentStats> {
  const supabase = await createClient()
  const countOnly = { count: "exact", head: true } as const

  const [totalPosts, publishedPosts, draftPosts, totalProjects, featuredProjects] =
    await Promise.all([
      supabase.from("posts").select("id", countOnly),
      supabase.from("posts").select("id", countOnly).eq("status", CONTENT_STATUS.PUBLISHED),
      supabase.from("posts").select("id", countOnly).eq("status", CONTENT_STATUS.DRAFT),
      supabase.from("projects").select("id", countOnly),
      supabase.from("projects").select("id", countOnly).eq("is_featured", true),
    ])

  return {
    totalPosts: totalPosts.count ?? 0,
    publishedPosts: publishedPosts.count ?? 0,
    draftPosts: draftPosts.count ?? 0,
    totalProjects: totalProjects.count ?? 0,
    featuredProjects: featuredProjects.count ?? 0,
  }
}

export type TopViewedPost = {
  id: string
  title: string
  views: number
}

// 已發布文章中瀏覽數最高的前幾篇；瀏覽數為 0 的文章不列入排行
export async function getTopViewedPosts(limit: number): Promise<TopViewedPost[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("posts")
    .select("id, title, view_count")
    .eq("status", CONTENT_STATUS.PUBLISHED)
    .gt("view_count", 0)
    .order("view_count", { ascending: false })
    .order("title", { ascending: true })
    .limit(limit)

  if (error) throw new Error(`讀取瀏覽排行失敗：${error.message}`)

  return data.map((post) => ({ id: post.id, title: post.title, views: post.view_count }))
}

export type CategoryShare = {
  // 父分類 id；未分類與「其他」使用固定鍵值
  key: string
  name: string
  count: number
  // CSS 顏色值（圖表色票變數），由伺服器依分類順序決定，前端直接使用
  color: string
}

export type CategoryDistribution = Record<CategoryType, CategoryShare[]>

const CATEGORY_SHARE_KEY = {
  UNCATEGORIZED: "uncategorized",
  OTHER: "other",
} as const

// 圖表最多以幾種顏色區分父分類，其餘合併為「其他」，避免色相過多難以辨識
const MAX_CATEGORY_SLICES = 6

// 色票依固定順序指派給父分類；「其他」接續下一個色票，「未分類」使用中性灰
const chartColor = (slot: number) => `var(--chart-${slot})`
const OTHER_COLOR = chartColor(MAX_CATEGORY_SLICES + 1)
const UNCATEGORIZED_COLOR = "var(--chart-muted)"

// 以父分類為單位彙總（含其子分類的內容），依分類排序固定順序，讓同一分類在每次載入時顏色不變
export async function getCategoryDistribution(): Promise<CategoryDistribution> {
  const supabase = await createClient()
  const countOnly = { count: "exact", head: true } as const

  const [trees, uncategorizedPosts, uncategorizedProjects] = await Promise.all([
    getAdminCategoryTrees(),
    supabase.from("posts").select("id", countOnly).is("category_id", null),
    supabase.from("projects").select("id", countOnly).is("category_id", null),
  ])

  const uncategorized: Record<CategoryType, number> = {
    [CATEGORY_TYPE.POST]: uncategorizedPosts.count ?? 0,
    [CATEGORY_TYPE.PROJECT]: uncategorizedProjects.count ?? 0,
  }

  const summarize = (type: CategoryType): CategoryShare[] => {
    // 先依分類順序指派顏色再過濾掉空分類，同一分類的顏色不會因其他分類是否有內容而改變
    const parents = trees[type].map((node, index) => ({
      key: node.id,
      name: node.name,
      count: node.children.reduce((sum, child) => sum + child.contentCount, node.contentCount),
      color: chartColor(index + 1),
    }))

    const shown = parents.slice(0, MAX_CATEGORY_SLICES)
    const otherCount = parents
      .slice(MAX_CATEGORY_SLICES)
      .reduce((sum, parent) => sum + parent.count, 0)

    const extras: CategoryShare[] = [
      { key: CATEGORY_SHARE_KEY.OTHER, name: "其他", count: otherCount, color: OTHER_COLOR },
      {
        key: CATEGORY_SHARE_KEY.UNCATEGORIZED,
        name: "未分類",
        count: uncategorized[type],
        color: UNCATEGORIZED_COLOR,
      },
    ]

    return [...shown, ...extras].filter((share) => share.count > 0)
  }

  return {
    [CATEGORY_TYPE.POST]: summarize(CATEGORY_TYPE.POST),
    [CATEGORY_TYPE.PROJECT]: summarize(CATEGORY_TYPE.PROJECT),
  }
}
