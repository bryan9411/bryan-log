import Link from "next/link"
import { CalendarIcon, ClockIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { postDetailPath } from "@/config/routes"
import type { PostSummary } from "@/lib/data/public-posts"
import { formatDate } from "@/lib/format"

type PostListItemProps = {
  post: PostSummary
}

export function PostListItem({ post }: PostListItemProps) {
  const { title, slug, excerpt, readingMinutes, publishedAt, categoryName, parentCategoryName } =
    post

  const maybeRenderCategory = () => {
    if (!categoryName) return null

    return (
      <Badge variant="tag" className="font-normal">
        {parentCategoryName ? `${parentCategoryName} / ${categoryName}` : categoryName}
      </Badge>
    )
  }

  const maybeRenderPublishedAt = () => {
    if (!publishedAt) return null

    return (
      <span className="flex items-center gap-1">
        <CalendarIcon className="size-3.5" aria-hidden />
        <time dateTime={publishedAt}>{formatDate(publishedAt)}</time>
      </span>
    )
  }

  const maybeRenderExcerpt = () => {
    if (!excerpt) return null
    return <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{excerpt}</p>
  }

  return (
    <article className="group relative flex flex-col gap-2.5 rounded-xl px-4 py-5 transition-colors hover:bg-muted/60 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {maybeRenderCategory()}
        {maybeRenderPublishedAt()}
        <span className="flex items-center gap-1">
          <ClockIcon className="size-3.5" aria-hidden />約 {readingMinutes} 分鐘閱讀
        </span>
      </div>
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
