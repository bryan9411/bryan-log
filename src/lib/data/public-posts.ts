import "server-only"

import { cacheLife, cacheTag } from "next/cache"

import { CACHE_TAG } from "@/lib/cache-tags"
import { CONTENT_STATUS } from "@/lib/constants/content"
import { CATEGORY_WITH_PARENT_SELECT, type CategoryRelation } from "@/lib/data/categories"
import { createPublicClient } from "@/lib/supabase/public"

export type PostSummary = {
  title: string
  slug: string
  excerpt: string | null
  readingMinutes: number
  publishedAt: string | null
  categoryName: string | null
  parentCategoryName: string | null
}

const POST_SUMMARY_COLUMNS = `title, slug, excerpt, reading_time_minutes, published_at, ${CATEGORY_WITH_PARENT_SELECT}`

// 以 "use cache" 跨請求共用查詢結果；後台存檔時以 updateTag 失效，平時每小時背景重新驗證一次
export async function getLatestPosts(limit: number): Promise<PostSummary[]> {
  "use cache"
  cacheLife("hours")
  cacheTag(CACHE_TAG.POSTS)

  const { data, error } = await createPublicClient()
    .from("posts")
    .select(POST_SUMMARY_COLUMNS)
    .eq("status", CONTENT_STATUS.PUBLISHED)
    .order("published_at", { ascending: false })
    .limit(limit)
    .overrideTypes<Array<{ category: CategoryRelation }>, { merge: true }>()

  if (error) throw new Error(`讀取最新文章失敗：${error.message}`)

  return data.map((post) => ({
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    readingMinutes: post.reading_time_minutes,
    publishedAt: post.published_at,
    categoryName: post.category?.name ?? null,
    parentCategoryName: post.category?.parent?.name ?? null,
  }))
}
