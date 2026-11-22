import { CalendarIcon, MessageSquareIcon, TriangleIcon } from "lucide-react"

import { ExternalLink } from "@/components/site/external-link"
import { formatDate, formatInteger } from "@/lib/format"
import type { HnRankingItem } from "@/lib/radar/ranking"

// 版面與文章列表一致：資訊列、標題、來源網域
// 整張卡片連到原文（Ask HN 等沒有外部連結的貼文直接是 HN 討論頁）；留言數另外連到 HN 討論頁，疊在卡片連結之上
export function HnRankCard({ item }: { item: HnRankingItem }) {
  const maybeRenderPostedAt = () => {
    if (!item.postedAt) return null
    return (
      <span className="flex items-center gap-1">
        <CalendarIcon className="size-3.5" aria-hidden />
        <time dateTime={item.postedAt}>{formatDate(item.postedAt)}</time>
      </span>
    )
  }

  const maybeRenderDomain = () => {
    if (!item.domain) return null
    return <p className="truncate text-sm text-muted-foreground">{item.domain}</p>
  }

  return (
    <article className="group relative flex flex-col gap-2.5 rounded-xl px-4 py-5 transition-colors hover:bg-muted/60 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1 font-semibold text-[#c25b3f] tabular-nums dark:text-[#de9070]">
          <TriangleIcon className="size-3" aria-hidden />
          {formatInteger(item.points)} 分
        </span>
        <ExternalLink
          href={item.hnUrl}
          className="relative z-10 flex items-center gap-1 tabular-nums transition-colors hover:text-foreground hover:underline hover:underline-offset-4"
        >
          <MessageSquareIcon className="size-3.5" aria-hidden />
          {formatInteger(item.comments)} 則討論
        </ExternalLink>
        {maybeRenderPostedAt()}
      </div>
      <h3 className="text-lg leading-snug font-semibold tracking-tight text-pretty">
        <ExternalLink href={item.url} className="after:absolute after:inset-0 after:rounded-xl">
          {item.title}
        </ExternalLink>
      </h3>
      {maybeRenderDomain()}
    </article>
  )
}
