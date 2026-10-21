import type { MetadataRoute } from "next"

import { postDetailPath, projectDetailPath, ROUTES } from "@/config/routes"
import {
  getPublishedPostSlugs,
  getPublishedProjectSlugs,
  type PublishedSlug,
} from "@/lib/data/published-slugs"
import { absoluteUrl } from "@/lib/seo"

type SitemapEntry = MetadataRoute.Sitemap[number]

function toDetailEntries(
  items: PublishedSlug[],
  toPath: (slug: string) => string,
  priority: number,
): MetadataRoute.Sitemap {
  return items.map(({ slug, updatedAt }) => ({
    url: absoluteUrl(toPath(slug)),
    lastModified: updatedAt,
    changeFrequency: "monthly",
    priority,
  }))
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
  const [posts, projects] = await Promise.all([getPublishedPostSlugs(), getPublishedProjectSlugs()])
  const latestUpdate = [posts[0]?.updatedAt, projects[0]?.updatedAt].filter(Boolean).sort().at(-1)

  return [
    {
      url: absoluteUrl(ROUTES.HOME),
      lastModified: latestUpdate,
      changeFrequency: "weekly",
      priority: 1,
    },
    toListEntry(ROUTES.POSTS, posts, 0.9),
    toListEntry(ROUTES.PROJECTS, projects, 0.8),
    ...toDetailEntries(posts, postDetailPath, 0.7),
    ...toDetailEntries(projects, projectDetailPath, 0.6),
  ]
}
