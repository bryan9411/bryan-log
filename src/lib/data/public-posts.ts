import "server-only"

import { cacheLife, cacheTag } from "next/cache"

import { CACHE_TAG } from "@/lib/cache-tags"
import { CONTENT_STATUS } from "@/lib/constants/content"
import type { CategorizedItem } from "@/lib/content/category-filter"
import { sanitizeArticleHtml } from "@/lib/content/sanitize"
import { addHeadingAnchors, type TocItem } from "@/lib/content/toc"
import {
  CATEGORY_WITH_PARENT_SELECT,
  splitCategoryRelation,
  type CategoryRelation,
} from "@/lib/data/categories"
import { createPublicClient } from "@/lib/supabase/public"

export type PostSummary = CategorizedItem & {
  title: string
  slug: string
  excerpt: string | null
  readingMinutes: number
  publishedAt: string | null
}

export type PostDetail = PostSummary & {
  html: string
  toc: TocItem[]
  viewCount: number
  coverImageUrl: string | null
  updatedAt: string
}

type CategoryOverride = Array<{ category: CategoryRelation }>

export const POST_SUMMARY_COLUMNS = `title, slug, excerpt, reading_time_minutes, published_at, ${CATEGORY_WITH_PARENT_SELECT}`

export const POST_DETAIL_COLUMNS = `${POST_SUMMARY_COLUMNS}, content_html, cover_image_url, view_count, updated_at`

export function toPostSummary(post: {
  title: string
  slug: string
  excerpt: string | null
  reading_time_minutes: number
  published_at: string | null
  category: CategoryRelation
}): PostSummary {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    readingMinutes: post.reading_time_minutes,
    publishedAt: post.published_at,
    ...splitCategoryRelation(post.category),
  }
}

// 以 "use cache" 跨請求共用查詢結果；後台存檔時以 updateTag 失效，平時每小時背景重新驗證一次
// 未傳入 limit 時回傳全部已發布文章，供列表頁的虛擬捲動清單使用
export async function getPublishedPosts(limit?: number): Promise<PostSummary[]> {
  "use cache"
  cacheLife("hours")
  cacheTag(CACHE_TAG.POSTS)

  const query = createPublicClient()
    .from("posts")
    .select(POST_SUMMARY_COLUMNS)
    .eq("status", CONTENT_STATUS.PUBLISHED)
    .order("published_at", { ascending: false })

  const { data, error } = await (limit ? query.limit(limit) : query).overrideTypes<
    CategoryOverride,
    { merge: true }
  >()

  if (error) throw new Error(`讀取文章列表失敗：${error.message}`)

  return data.map(toPostSummary)
}

// 內文在存檔時已由伺服器產生並清理過，輸出前仍以 DOMPurify 再清理一次作為縱深防禦：
// 即使資料庫遭直接竄改，也不會把惡意腳本送到讀者的瀏覽器；清理結果隨快取保存，不會每次請求重算
export async function getPublishedPost(slug: string): Promise<PostDetail | null> {
  "use cache"
  cacheLife("hours")
  cacheTag(CACHE_TAG.POSTS)

  const { data, error } = await createPublicClient()
    .from("posts")
    .select(POST_DETAIL_COLUMNS)
    .eq("status", CONTENT_STATUS.PUBLISHED)
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<CategoryOverride[number], { merge: true }>()

  if (error) throw new Error(`讀取文章失敗：${error.message}`)
  if (!data) return null

  return toPostDetail(data)
}

// 前台內頁與草稿預覽共用：內文清理、加上標題錨點並轉為頁面所需格式
export function toPostDetail(
  post: Parameters<typeof toPostSummary>[0] & {
    content_html: string
    cover_image_url: string | null
    view_count: number
    updated_at: string
  },
): PostDetail {
  // 錨點 id 在清理之後才加上：id 不在 DOMPurify 白名單內，且由伺服器自行產生，內容可信
  const { html, toc } = addHeadingAnchors(sanitizeArticleHtml(post.content_html))

  return {
    ...toPostSummary(post),
    html,
    toc,
    viewCount: post.view_count,
    coverImageUrl: post.cover_image_url,
    updatedAt: post.updated_at,
  }
}
