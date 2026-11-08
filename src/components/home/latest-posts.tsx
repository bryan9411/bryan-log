import { FileTextIcon } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { PostListItem } from "@/components/posts/post-list-item"
import { HOME_LATEST_POSTS_LIMIT } from "@/config/home"
import { getPublishedPosts } from "@/lib/data/public-posts"
import type { Section } from "@/lib/data/sections"

// 查詢有 "use cache"，內容會一併預渲染進靜態外殼由 CDN 回應；後台更新時以快取標籤失效，排程內容則靠快取到期
export async function LatestPosts({ section }: { section: Section }) {
  const posts = await getPublishedPosts({ sectionId: section.id, limit: HOME_LATEST_POSTS_LIMIT })

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={FileTextIcon}
        title="尚無文章"
        description={`第一篇${section.name}正在撰寫中，敬請期待。`}
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
