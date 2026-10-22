import Link from "next/link"

import { postDetailPath } from "@/config/routes"
import { archiveYearId, type ArchiveMonth, type ArchiveYear } from "@/lib/content/archive"
import { cn } from "@/lib/utils"

type ArchiveTimelineProps = {
  years: ArchiveYear[]
}

// 年份錨點導覽：文章多時可直接跳到指定年份
export function ArchiveYearNav({ years }: ArchiveTimelineProps) {
  return (
    <nav aria-label="依年份跳轉">
      <ul className="flex flex-wrap gap-2">
        {years.map(({ year, postCount }) => (
          <li key={year}>
            <a
              href={`#${archiveYearId(year)}`}
              className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-sm transition-colors hover:border-ring/60 hover:text-foreground"
            >
              <span className="font-medium tabular-nums">{year}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{postCount}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// 垂直時間軸：左側細線串起每個月份節點，文章以「日期＋標題」緊湊排列，方便快速掃描
export function ArchiveTimeline({ years }: ArchiveTimelineProps) {
  const renderMonth = ({ month, posts }: ArchiveMonth) => (
    <li key={month} className="relative pl-8">
      <span
        className="absolute top-1.5 left-0 size-2.5 -translate-x-1/2 rounded-full bg-ring ring-4 ring-background"
        aria-hidden
      />
      <h3 className="text-sm font-medium text-muted-foreground">
        {month} 月<span className="ml-2 text-xs tabular-nums">{posts.length} 篇</span>
      </h3>
      <ol className="mt-3 flex flex-col gap-1">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link
              href={postDetailPath(post.slug)}
              className="group -mx-3 flex items-baseline gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-muted/60"
            >
              <time
                dateTime={post.publishedAt}
                className="w-10 shrink-0 font-mono text-xs text-muted-foreground tabular-nums"
              >
                {String(month).padStart(2, "0")}/{String(post.day).padStart(2, "0")}
              </time>
              <span className="min-w-0 flex-1 leading-snug text-pretty group-hover:underline group-hover:decoration-ring/60 group-hover:underline-offset-4">
                {post.title}
              </span>
              <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                約 {post.readingMinutes} 分鐘
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </li>
  )

  const renderYear = ({ year, postCount, months }: ArchiveYear, index: number) => (
    <section
      key={year}
      id={archiveYearId(year)}
      aria-labelledby={`${archiveYearId(year)}-heading`}
      className="scroll-mt-24"
    >
      <h2
        id={`${archiveYearId(year)}-heading`}
        className={cn(
          "flex items-baseline gap-3 text-2xl font-semibold tracking-tight tabular-nums",
          index > 0 && "pt-4",
        )}
      >
        {year}
        <span className="text-sm font-normal text-muted-foreground">{postCount} 篇文章</span>
      </h2>
      <ol className="mt-6 ml-1 flex flex-col gap-8 border-l border-border">
        {months.map(renderMonth)}
      </ol>
    </section>
  )

  return <div className="flex flex-col gap-12">{years.map(renderYear)}</div>
}
