import Link from "next/link"
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"

import { postDetailPath } from "@/config/routes"
import type { AdjacentPosts } from "@/lib/content/post-neighbors"
import type { PostSummary } from "@/lib/data/public-posts"
import { cn } from "@/lib/utils"

const DIRECTION = {
  PREVIOUS: "previous",
  NEXT: "next",
} as const

type Direction = (typeof DIRECTION)[keyof typeof DIRECTION]

const DIRECTION_LABEL: Record<Direction, string> = {
  [DIRECTION.PREVIOUS]: "上一篇",
  [DIRECTION.NEXT]: "下一篇",
}

// 文末上一篇／下一篇：依發布時間銜接前後文章，只有一側時另一側留白以維持左右對齊
export function PostNavigation({ previous, next }: AdjacentPosts) {
  if (!previous && !next) return null

  const maybeRenderLink = (post: PostSummary | null, direction: Direction) => {
    if (!post) return <div aria-hidden className="hidden sm:block" />

    const isNext = direction === DIRECTION.NEXT
    const Icon = isNext ? ArrowRightIcon : ArrowLeftIcon

    return (
      <Link
        href={postDetailPath(post.slug)}
        rel={isNext ? "next" : "prev"}
        className={cn(
          "group flex flex-col gap-1.5 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/60",
          isNext && "sm:items-end sm:text-right",
        )}
      >
        <span
          className={cn(
            "flex items-center gap-1.5 text-xs text-muted-foreground",
            isNext && "flex-row-reverse",
          )}
        >
          <Icon
            className={cn(
              "size-3.5 transition-transform",
              isNext ? "group-hover:translate-x-0.5" : "group-hover:-translate-x-0.5",
            )}
            aria-hidden
          />
          {DIRECTION_LABEL[direction]}
        </span>
        <span className="line-clamp-2 font-medium text-pretty">{post.title}</span>
      </Link>
    )
  }

  return (
    <nav aria-label="上一篇與下一篇文章" className="grid gap-3 sm:grid-cols-2">
      {maybeRenderLink(previous, DIRECTION.PREVIOUS)}
      {maybeRenderLink(next, DIRECTION.NEXT)}
    </nav>
  )
}
