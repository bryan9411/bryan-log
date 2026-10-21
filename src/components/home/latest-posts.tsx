import { connection } from "next/server"
import { FileTextIcon } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { PostListItem } from "@/components/home/post-list-item"
import { Skeleton } from "@/components/ui/skeleton"
import { HOME_LATEST_POSTS_LIMIT } from "@/config/home"
import { getLatestPosts } from "@/lib/data/public-posts"

// connection() 讓此區塊成為請求時才渲染的動態洞，於 Suspense 內串流；
// 查詢本身仍有 "use cache"，命中快取時幾乎零延遲，後台更新後也能即時反映
export async function LatestPosts() {
  await connection()
  const posts = await getLatestPosts(HOME_LATEST_POSTS_LIMIT)

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

// 骨架屏的筆數與排版和實際列表一致，串流替換時版面不會跳動
export function LatestPostsSkeleton() {
  return (
    <ul aria-hidden className="-mx-4 flex flex-col divide-y divide-border/60 sm:-mx-5">
      {Array.from({ length: HOME_LATEST_POSTS_LIMIT }, (_, index) => (
        <li key={index} className="flex flex-col gap-3 px-4 py-5 sm:px-5">
          <div className="flex gap-4">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </li>
      ))}
    </ul>
  )
}
