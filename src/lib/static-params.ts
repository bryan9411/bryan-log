import type { PublishedSlug } from "@/lib/data/published-slugs"

// Cache Components 規定 generateStaticParams 至少回傳一筆；資料庫尚無已發布內容時，
// 以不可能存在的 slug（含大寫，違反資料庫的 slug 格式限制）佔位，該頁會直接回應 404
const PLACEHOLDER_SLUG = "__NO_PUBLISHED_CONTENT__"

export function toSlugParams(items: PublishedSlug[]) {
  if (items.length === 0) return [{ slug: PLACEHOLDER_SLUG }]
  return items.map(({ slug }) => ({ slug }))
}
