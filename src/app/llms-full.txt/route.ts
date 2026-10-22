import { getPublishedPostsForLlms } from "@/lib/data/public-posts"
import { buildLlmsFullTxt } from "@/lib/llms/llms-txt"

export async function GET() {
  const posts = await getPublishedPostsForLlms()

  return new Response(buildLlmsFullTxt(posts), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
