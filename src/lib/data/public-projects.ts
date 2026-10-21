import "server-only"

import { cacheLife, cacheTag } from "next/cache"

import { CACHE_TAG } from "@/lib/cache-tags"
import { CONTENT_STATUS } from "@/lib/constants/content"
import { createPublicClient } from "@/lib/supabase/public"

export type ProjectSummary = {
  title: string
  slug: string
  summary: string
  coverImageUrl: string | null
  demoUrl: string | null
  repoUrl: string | null
  techStack: string[]
}

export async function getFeaturedProjects(limit: number): Promise<ProjectSummary[]> {
  "use cache"
  cacheLife("hours")
  cacheTag(CACHE_TAG.PROJECTS)

  const { data, error } = await createPublicClient()
    .from("projects")
    .select("title, slug, summary, cover_image_url, demo_url, repo_url, tech_stack")
    .eq("status", CONTENT_STATUS.PUBLISHED)
    .eq("is_featured", true)
    .order("sort_order", { ascending: true })
    .limit(limit)

  if (error) throw new Error(`讀取精選專案失敗：${error.message}`)

  return data.map((project) => ({
    title: project.title,
    slug: project.slug,
    summary: project.summary,
    coverImageUrl: project.cover_image_url,
    demoUrl: project.demo_url,
    repoUrl: project.repo_url,
    techStack: project.tech_stack,
  }))
}
