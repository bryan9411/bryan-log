import Link from "next/link"

import { PostMeta } from "@/components/posts/post-meta"
import { postDetailPath } from "@/config/routes"
import type { PostSummary } from "@/lib/data/public-posts"

type PostListItemProps = {
  post: PostSummary
}

export function PostListItem({ post }: PostListItemProps) {
  const { title, slug, excerpt } = post

  const maybeRenderExcerpt = () => {
    if (!excerpt) return null
    return <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{excerpt}</p>
  }

  return (
    <article className="group relative flex flex-col gap-2.5 rounded-xl px-4 py-5 transition-colors hover:bg-muted/60 sm:px-5">
      <PostMeta post={post} />
      <h3 className="text-lg leading-snug font-semibold tracking-tight text-pretty">
        {/* 以偽元素讓整張卡片可點擊，同時保持單一連結的語意 */}
        <Link href={postDetailPath(slug)} className="after:absolute after:inset-0 after:rounded-xl">
          {title}
        </Link>
      </h3>
      {maybeRenderExcerpt()}
    </article>
  )
}
