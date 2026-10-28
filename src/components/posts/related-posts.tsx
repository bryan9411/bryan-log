import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { postDetailPath } from "@/config/routes"
import { formatCategoryPath } from "@/lib/content/category-filter"
import type { PostSummary } from "@/lib/data/public-posts"

type RelatedPostsProps = {
  posts: PostSummary[]
}

export function RelatedPosts({ posts }: RelatedPostsProps) {
  if (posts.length === 0) return null

  const renderCard = (post: PostSummary) => {
    const categoryPath = formatCategoryPath(post)

    return (
      <li key={post.slug} className="flex">
        <Link
          href={postDetailPath(post.section.slug, post.slug)}
          className="flex w-full flex-col gap-2.5 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/60"
        >
          {categoryPath ? (
            <Badge variant="tag" className="font-normal">
              {categoryPath}
            </Badge>
          ) : null}
          <span className="line-clamp-2 font-medium text-pretty">{post.title}</span>
          {post.excerpt ? (
            <span className="line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</span>
          ) : null}
          <span className="mt-auto text-xs text-muted-foreground">
            約 {post.readingMinutes} 分鐘閱讀
          </span>
        </Link>
      </li>
    )
  }

  return (
    <section aria-labelledby="related-posts-heading" className="flex flex-col gap-4">
      <h2 id="related-posts-heading" className="text-lg font-semibold tracking-tight">
        相關文章
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{posts.map(renderCard)}</ul>
    </section>
  )
}
