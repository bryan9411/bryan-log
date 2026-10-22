import { getPublishedPosts } from "@/lib/data/public-posts"
import { getPublishedProjects } from "@/lib/data/public-projects"
import { buildLlmsTxt } from "@/lib/llms/llms-txt"

// 資料來自已快取的文章與作品查詢，建置時預先產生；後台存檔時隨快取標籤一併更新
export async function GET() {
  const [posts, projects] = await Promise.all([getPublishedPosts(), getPublishedProjects()])

  return new Response(buildLlmsTxt(posts, projects), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
