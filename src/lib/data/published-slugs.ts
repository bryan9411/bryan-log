import "server-only"

import { cacheLife, cacheTag } from "next/cache"

import { CACHE_TAG, type CacheTag } from "@/lib/cache-tags"
import { CONTENT_STATUS } from "@/lib/constants/content"
import { createPublicClient } from "@/lib/supabase/public"

export type PublishedSlug = {
  slug: string
  updatedAt: string
}

const PUBLISHED_CONTENT_TABLE = {
  POSTS: "posts",
  PROJECTS: "projects",
} as const

type PublishedContentTable = (typeof PUBLISHED_CONTENT_TABLE)[keyof typeof PUBLISHED_CONTENT_TABLE]

const TABLE_CACHE_TAG: Record<PublishedContentTable, CacheTag> = {
  [PUBLISHED_CONTENT_TABLE.POSTS]: CACHE_TAG.POSTS,
  [PUBLISHED_CONTENT_TABLE.PROJECTS]: CACHE_TAG.PROJECTS,
}

// 文章與作品的 sitemap 查詢結構相同，共用同一個查詢並各自掛上對應的快取標籤
async function getPublishedSlugs(table: PublishedContentTable): Promise<PublishedSlug[]> {
  "use cache"
  cacheLife("hours")
  cacheTag(TABLE_CACHE_TAG[table])

  const { data, error } = await createPublicClient()
    .from(table)
    .select("slug, updated_at")
    .eq("status", CONTENT_STATUS.PUBLISHED)
    .order("updated_at", { ascending: false })

  if (error) throw new Error(`讀取 sitemap 資料失敗：${error.message}`)

  return data.map(({ slug, updated_at }) => ({ slug, updatedAt: updated_at }))
}

export function getPublishedPostSlugs() {
  return getPublishedSlugs(PUBLISHED_CONTENT_TABLE.POSTS)
}

export function getPublishedProjectSlugs() {
  return getPublishedSlugs(PUBLISHED_CONTENT_TABLE.PROJECTS)
}
