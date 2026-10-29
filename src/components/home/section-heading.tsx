import Link from "next/link"
import type { Route } from "next"
import { ArrowRightIcon } from "lucide-react"

type SectionHeadingProps = {
  id: string
  title: string
  description: string
  // 沒有對應的完整列表頁時（例如區塊導覽卡）不顯示「更多」連結
  moreHref?: Route
  moreLabel?: string
}

export function SectionHeading({
  id,
  title,
  description,
  moreHref,
  moreLabel,
}: SectionHeadingProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="flex flex-col gap-1.5">
        <h2 id={id} className="text-2xl font-semibold tracking-tight">
          {title}
        </h2>
        <p className="text-sm text-pretty text-muted-foreground">{description}</p>
      </div>
      {moreHref ? (
        <Link
          href={moreHref}
          className="group/more flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {moreLabel}
          <ArrowRightIcon
            className="size-4 transition-transform group-hover/more:translate-x-0.5"
            aria-hidden
          />
        </Link>
      ) : null}
    </div>
  )
}
