import type { MetadataRoute } from "next"

import { postDetailPath, projectDetailPath, ROUTES, sectionPath } from "@/config/routes"
import {
  getPublishedPostSlugs,
  getPublishedProjectSlugs,
  type PublishedSlug,
} from "@/lib/data/published-slugs"
import { getSections } from "@/lib/data/sections"
import { absoluteUrl } from "@/lib/seo"

type SitemapEntry = MetadataRoute.Sitemap[number]

function toDetailEntry(path: string, updatedAt: string, priority: number): SitemapEntry {
  return {
    url: absoluteUrl(path),
    lastModified: updatedAt,
    changeFrequency: "monthly",
    priority,
  }
}

// 列表頁的最後更新時間取該類內容中最新的一筆，沒有內容時省略
function toListEntry(path: string, items: PublishedSlug[], priority: number): SitemapEntry {
  return {
    url: absoluteUrl(path),
    lastModified: items[0]?.updatedAt,
    changeFrequency: "weekly",
    priority,
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [sections, posts, projects] = await Promise.all([
    getSections(),
    getPublishedPostSlugs(),
    getPublishedProjectSlugs(),
  ])
  const latestUpdate = [posts[0]?.updatedAt, projects[0]?.updatedAt].filter(Boolean).sort().at(-1)

  return [
    {
      url: absoluteUrl(ROUTES.HOME),
      lastModified: latestUpdate,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...sections.map(({ slug }) =>
      toListEntry(
        sectionPath(slug),
        posts.filter((post) => post.sectionSlug === slug),
        0.9,
      ),
    ),
    toListEntry(ROUTES.PROJECTS, projects, 0.8),
    toListEntry(ROUTES.ARCHIVES, posts, 0.5),
    ...posts.map(({ sectionSlug, slug, updatedAt }) =>
      toDetailEntry(postDetailPath(sectionSlug, slug), updatedAt, 0.7),
    ),
    ...projects.map(({ slug, updatedAt }) =>
      toDetailEntry(projectDetailPath(slug), updatedAt, 0.6),
    ),
  ]
}
