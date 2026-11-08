import "server-only"

import { cache } from "react"

import {
  CATEGORY_TYPE,
  CONTENT_STATUS,
  isScheduledPublish,
  type CategoryType,
} from "@/lib/constants/content"
import { getAdminCategoryTrees } from "@/lib/data/admin-categories"
import { createClient } from "@/lib/supabase/server"

export type ContentStats = {
  totalPosts: number
  publishedPosts: number
  draftPosts: number
  totalProjects: number
  featuredProjects: number
}

// 儀表板的統計、排行與分類占比都由這兩個查詢算出：只取少量欄位，同一次請求內以 React cache 共用
const getDashboardRows = cache(async () => {
  const supabase = await createClient()

  const [posts, projects] = await Promise.all([
    supabase.from("posts").select("id, title, status, published_at, view_count, category_id"),
    supabase.from("projects").select("id, is_featured, category_id"),
  ])

  if (posts.error) throw new Error(`讀取文章統計失敗：${posts.error.message}`)
  if (projects.error) throw new Error(`讀取作品統計失敗：${projects.error.message}`)

  return { posts: posts.data, projects: projects.data }
})

export async function getContentStats(): Promise<ContentStats> {
  const { posts, projects } = await getDashboardRows()

  return {
    totalPosts: posts.length,
    // 已排程但尚未到時間的文章訪客還看不到，不計入已發布
    publishedPosts: posts.filter(
      ({ status, published_at }) =>
        status === CONTENT_STATUS.PUBLISHED && !isScheduledPublish(status, published_at),
    ).length,
    draftPosts: posts.filter(({ status }) => status === CONTENT_STATUS.DRAFT).length,
    totalProjects: projects.length,
    featuredProjects: projects.filter(({ is_featured }) => is_featured).length,
  }
}

export type TopViewedPost = {
  id: string
  title: string
  views: number
}

// 已發布文章中瀏覽數最高的前幾篇；瀏覽數為 0 的文章不列入排行
export async function getTopViewedPosts(limit: number): Promise<TopViewedPost[]> {
  const { posts } = await getDashboardRows()

  return posts
    .filter(({ status, view_count }) => status === CONTENT_STATUS.PUBLISHED && view_count > 0)
    .sort((a, b) => b.view_count - a.view_count || a.title.localeCompare(b.title))
    .slice(0, limit)
    .map((post) => ({ id: post.id, title: post.title, views: post.view_count }))
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
  const [trees, { posts, projects }] = await Promise.all([
    getAdminCategoryTrees(),
    getDashboardRows(),
  ])

  const countUncategorized = (rows: Array<{ category_id: string | null }>) =>
    rows.filter(({ category_id }) => category_id === null).length

  const uncategorized: Record<CategoryType, number> = {
    [CATEGORY_TYPE.POST]: countUncategorized(posts),
    [CATEGORY_TYPE.PROJECT]: countUncategorized(projects),
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
