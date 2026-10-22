import "server-only"

import { cacheLife, cacheTag } from "next/cache"

import { CACHE_TAG } from "@/lib/cache-tags"
import { CONTENT_STATUS } from "@/lib/constants/content"
import type { CategorizedItem } from "@/lib/content/category-filter"
import { sanitizeArticleHtml } from "@/lib/content/sanitize"
import {
  CATEGORY_WITH_PARENT_SELECT,
  splitCategoryRelation,
  type CategoryRelation,
} from "@/lib/data/categories"
import { createPublicClient } from "@/lib/supabase/public"

export type ProjectSummary = CategorizedItem & {
  title: string
  slug: string
  summary: string
  coverImageUrl: string | null
  demoUrl: string | null
  repoUrl: string | null
  techStack: string[]
}

export type ProjectDetail = ProjectSummary & {
  html: string
  publishedAt: string | null
  updatedAt: string
}

type CategoryOverride = { category: CategoryRelation }

const PROJECT_SUMMARY_COLUMNS = `title, slug, summary, cover_image_url, demo_url, repo_url, tech_stack, ${CATEGORY_WITH_PARENT_SELECT}`

function toProjectSummary(project: {
  title: string
  slug: string
  summary: string
  cover_image_url: string | null
  demo_url: string | null
  repo_url: string | null
  tech_stack: string[]
  category: CategoryRelation
}): ProjectSummary {
  return {
    title: project.title,
    slug: project.slug,
    summary: project.summary,
    coverImageUrl: project.cover_image_url,
    demoUrl: project.demo_url,
    repoUrl: project.repo_url,
    techStack: project.tech_stack,
    ...splitCategoryRelation(project.category),
  }
}

function selectPublishedProjects() {
  return (
    createPublicClient()
      .from("projects")
      .select(PROJECT_SUMMARY_COLUMNS)
      .eq("status", CONTENT_STATUS.PUBLISHED)
      // 與後台排序規則一致：sort_order 越小越前面，同序時依建立時間與 id
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
  )
}

export async function getFeaturedProjects(limit: number): Promise<ProjectSummary[]> {
  "use cache"
  cacheLife("hours")
  cacheTag(CACHE_TAG.PROJECTS)

  const { data, error } = await selectPublishedProjects()
    .eq("is_featured", true)
    .limit(limit)
    .overrideTypes<CategoryOverride[], { merge: true }>()

  if (error) throw new Error(`讀取精選專案失敗：${error.message}`)

  return data.map(toProjectSummary)
}

export async function getPublishedProjects(): Promise<ProjectSummary[]> {
  "use cache"
  cacheLife("hours")
  cacheTag(CACHE_TAG.PROJECTS)

  const { data, error } = await selectPublishedProjects().overrideTypes<
    CategoryOverride[],
    { merge: true }
  >()

  if (error) throw new Error(`讀取作品列表失敗：${error.message}`)

  return data.map(toProjectSummary)
}

// 專案介紹同樣在輸出前以 DOMPurify 清理，並隨快取保存
export async function getPublishedProject(slug: string): Promise<ProjectDetail | null> {
  "use cache"
  cacheLife("hours")
  cacheTag(CACHE_TAG.PROJECTS)

  const { data, error } = await createPublicClient()
    .from("projects")
    .select(`${PROJECT_SUMMARY_COLUMNS}, description_html, published_at, updated_at`)
    .eq("status", CONTENT_STATUS.PUBLISHED)
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<CategoryOverride, { merge: true }>()

  if (error) throw new Error(`讀取作品失敗：${error.message}`)
  if (!data) return null

  return {
    ...toProjectSummary(data),
    html: sanitizeArticleHtml(data.description_html),
    publishedAt: data.published_at,
    updatedAt: data.updated_at,
  }
}
