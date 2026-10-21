"use client"

import { FileTextIcon } from "lucide-react"

import { ContentBrowser } from "@/components/content/content-browser"
import { VirtualList } from "@/components/content/virtual-list"
import { PostListItem } from "@/components/posts/post-list-item"
import type { CategoryTreeNode } from "@/lib/content/category-filter"
import type { PostSummary } from "@/lib/data/public-posts"

const ESTIMATED_ITEM_HEIGHT = 150

type PostBrowserProps = {
  posts: PostSummary[]
  categories: CategoryTreeNode[]
}

export function PostBrowser({ posts, categories }: PostBrowserProps) {
  return (
    <ContentBrowser
      items={posts}
      categories={categories}
      unit="篇文章"
      emptyIcon={FileTextIcon}
      emptyTitle="尚無文章"
      emptyDescription="第一篇技術文章正在撰寫中，敬請期待。"
    >
      {(filteredPosts) => (
        <VirtualList
          items={filteredPosts}
          getItemKey={(post) => post.slug}
          estimateSize={ESTIMATED_ITEM_HEIGHT}
          label="文章列表"
          className="-mx-4 sm:-mx-5"
          renderItem={(post) => (
            <div className="w-full border-b border-border/60">
              <PostListItem post={post} />
            </div>
          )}
        />
      )}
    </ContentBrowser>
  )
}
