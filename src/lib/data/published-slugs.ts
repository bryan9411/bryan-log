import "server-only"

import { cacheLife, cacheTag } from "next/cache"

import { CACHE_TAG } from "@/lib/cache-tags"
import { CONTENT_STATUS } from "@/lib/constants/content"
import { createPublicClient } from "@/lib/supabase/public"

export type PublishedSlug = {
  slug: string
  updatedAt: string
}

export type PublishedPostSlug = PublishedSlug & {
  sectionSlug: string
}

// 文章網址包含區塊代稱，因此一併取回所屬區塊；section_id 為必填外鍵，關聯一定存在
export async function getPublishedPostSlugs(): Promise<PublishedPostSlug[]> {
  "use cache"
  cacheLife("hours")
  cacheTag(CACHE_TAG.POSTS)

  const { data, error } = await createPublicClient()
    .from("posts")
    .select("slug, updated_at, section:sections(slug)")
    .eq("status", CONTENT_STATUS.PUBLISHED)
    .order("updated_at", { ascending: false })
    .overrideTypes<Array<{ section: { slug: string } }>, { merge: true }>()

  if (error) throw new Error(`讀取 sitemap 資料失敗：${error.message}`)

  return data.map(({ slug, updated_at, section }) => ({
    slug,
    updatedAt: updated_at,
    sectionSlug: section.slug,
  }))
}

export async function getPublishedProjectSlugs(): Promise<PublishedSlug[]> {
  "use cache"
  cacheLife("hours")
  cacheTag(CACHE_TAG.PROJECTS)

  const { data, error } = await createPublicClient()
    .from("projects")
    .select("slug, updated_at")
    .eq("status", CONTENT_STATUS.PUBLISHED)
    .order("updated_at", { ascending: false })

  if (error) throw new Error(`讀取 sitemap 資料失敗：${error.message}`)

  return data.map(({ slug, updated_at }) => ({ slug, updatedAt: updated_at }))
}
