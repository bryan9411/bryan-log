"use client"

import { FileTextIcon } from "lucide-react"

import { ContentBrowser } from "@/components/content/content-browser"
import { PostListItem } from "@/components/posts/post-list-item"
import type { CategoryTreeNode } from "@/lib/content/category-filter"
import type { PostSummary } from "@/lib/data/public-posts"

type PostBrowserProps = {
  posts: PostSummary[]
  categories: CategoryTreeNode[]
  sectionName: string
}

export function PostBrowser({ posts, categories, sectionName }: PostBrowserProps) {
  return (
    <ContentBrowser
      items={posts}
      categories={categories}
      unit="篇文章"
      emptyIcon={FileTextIcon}
      emptyTitle="尚無文章"
      emptyDescription={`第一篇${sectionName}正在撰寫中，敬請期待。`}
    >
      {(filteredPosts) => (
        <ul aria-label="文章列表" className="-mx-4 sm:-mx-5">
          {filteredPosts.map((post) => (
            <li key={post.slug} className="border-b border-border/60 content-auto-row">
              <PostListItem post={post} />
            </li>
          ))}
        </ul>
      )}
    </ContentBrowser>
  )
}
