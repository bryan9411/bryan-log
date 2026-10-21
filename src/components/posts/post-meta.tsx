import type { ReactNode } from "react"
import { CalendarIcon, ClockIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { formatCategoryPath } from "@/lib/content/category-filter"
import type { PostSummary } from "@/lib/data/public-posts"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

type PostMetaProps = {
  post: PostSummary
  // 額外的資訊欄位（例如文章內頁的瀏覽數），接在閱讀時間之後
  extra?: ReactNode
  className?: string
}

// 分類、發布日期與閱讀時間；列表與文章內頁共用
export function PostMeta({ post, extra, className }: PostMetaProps) {
  const { readingMinutes, publishedAt } = post
  const categoryPath = formatCategoryPath(post)

  const maybeRenderCategory = () => {
    if (!categoryPath) return null

    return (
      <Badge variant="tag" className="font-normal">
        {categoryPath}
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

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground",
        className,
      )}
    >
      {maybeRenderCategory()}
      {maybeRenderPublishedAt()}
      <span className="flex items-center gap-1">
        <ClockIcon className="size-3.5" aria-hidden />約 {readingMinutes} 分鐘閱讀
      </span>
      {extra}
    </div>
  )
}
