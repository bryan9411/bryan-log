import "server-only"

import { CONTENT_STATUS } from "@/lib/constants/content"
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
