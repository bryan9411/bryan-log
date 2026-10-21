import { formatCategoryPath } from "@/lib/content/category-filter"
import { getPublishedPosts } from "@/lib/data/public-posts"
import type { SearchIndexResponse } from "@/lib/search/types"

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
  }

  return Response.json(body)
}
