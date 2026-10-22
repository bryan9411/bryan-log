import { formatCategoryPath } from "@/lib/content/category-filter"
import { getPublishedPosts, type PostSummary } from "@/lib/data/public-posts"
import type { SearchIndexResponse } from "@/lib/search/types"

const POPULAR_TAGS_LIMIT = 8

// 父分類與子分類各自計數，文章數相同時依名稱排序，確保每次輸出順序一致
function collectPopularTags(posts: PostSummary[]) {
  const counts = new Map<string, number>()
  const increment = (name: string) => counts.set(name, (counts.get(name) ?? 0) + 1)

  posts.forEach(({ category, parentCategory }) => {
    if (parentCategory) increment(parentCategory.name)
    if (category) increment(category.name)
  })

  return [...counts]
    .sort(([nameA, countA], [nameB, countB]) => countB - countA || nameA.localeCompare(nameB))
    .slice(0, POPULAR_TAGS_LIMIT)
    .map(([name]) => name)
}

// 資料來自 "use cache" 查詢，建置時即預渲染為靜態 JSON；後台存檔時與文章快取標籤一起失效
export async function GET() {
  const posts = await getPublishedPosts()

  const body: SearchIndexResponse = {
    entries: posts.map((post) => ({
      title: post.title,
      slug: post.slug,
      categoryPath: formatCategoryPath(post),
      readingMinutes: post.readingMinutes,
    })),
    popularTags: collectPopularTags(posts),
  }

  return Response.json(body)
}
