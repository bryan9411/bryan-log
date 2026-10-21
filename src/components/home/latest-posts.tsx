import { connection } from "next/server"
import { FileTextIcon } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { PostListItem } from "@/components/posts/post-list-item"
import { PostListSkeleton } from "@/components/posts/post-list-skeleton"
import { HOME_LATEST_POSTS_LIMIT } from "@/config/home"
import { getPublishedPosts } from "@/lib/data/public-posts"

// connection() 讓此區塊成為請求時才渲染的動態洞，於 Suspense 內串流；
// 查詢本身仍有 "use cache"，命中快取時幾乎零延遲，後台更新後也能即時反映
export async function LatestPosts() {
  await connection()
  const posts = await getPublishedPosts(HOME_LATEST_POSTS_LIMIT)

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={FileTextIcon}
        title="尚無文章"
        description="第一篇技術文章正在撰寫中，敬請期待。"
      />
    )
  }

  return (
    <ul className="-mx-4 flex flex-col divide-y divide-border/60 sm:-mx-5">
      {posts.map((post) => (
        <li key={post.slug}>
          <PostListItem post={post} />
        </li>
      ))}
    </ul>
  )
}

export function LatestPostsSkeleton() {
  return <PostListSkeleton count={HOME_LATEST_POSTS_LIMIT} />
}
