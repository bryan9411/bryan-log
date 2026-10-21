"use client"

import { useMemo } from "react"
import { ListIcon } from "lucide-react"

import { useActiveHeading } from "@/hooks/use-active-heading"
import { TOC_LEVEL, TOC_VARIANT, type TocItem, type TocVariant } from "@/lib/content/toc"
import { cn } from "@/lib/utils"

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

type TableOfContentsProps = {
  items: TocItem[]
  variant: TocVariant
}

// 內文段落套用了 content-visibility: auto，尚未渲染的段落高度只是預估值，
// 平滑捲動途中版面會逐步修正，結束後若沒有準確對齊標題就再瞬間校正一次
function scrollToHeading(id: string) {
  const heading = document.getElementById(id)
  if (!heading) return

  const prefersReducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches

  heading.scrollIntoView({ behavior: prefersReducedMotion ? "instant" : "smooth" })
  window.history.replaceState(null, "", `#${id}`)

  const realign = () => heading.scrollIntoView({ behavior: "instant" })
  window.addEventListener("scrollend", realign, { once: true })
}

export function TableOfContents({ items, variant }: TableOfContentsProps) {
  const ids = useMemo(() => items.map(({ id }) => id), [items])
  const activeId = useActiveHeading(ids)

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault()
    scrollToHeading(id)
  }

  const renderList = () => (
    <ol className="flex flex-col border-l border-border">
      {items.map(({ id, text, level }) => {
        const isActive = id === activeId

        return (
          <li key={id}>
            <a
              href={`#${id}`}
              onClick={(event) => handleClick(event, id)}
              aria-current={isActive ? "location" : undefined}
              className={cn(
                "-ml-px block border-l-2 border-transparent py-1.5 pr-2 text-sm leading-snug text-muted-foreground transition-colors hover:text-foreground",
                level === TOC_LEVEL.H2 ? "pl-4" : "pl-7 text-[0.8rem]",
                isActive &&
                  "border-foreground font-medium text-foreground drop-shadow-[0_0_8px_color-mix(in_oklch,var(--foreground)_35%,transparent)]",
              )}
            >
              {text}
            </a>
          </li>
        )
      })}
    </ol>
  )

  if (variant === TOC_VARIANT.INLINE) {
    return (
      <details className="group rounded-xl border bg-card px-4 py-3 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
          <ListIcon className="size-4" aria-hidden />
          文章目錄
          <span className="ml-auto text-xs text-muted-foreground group-open:hidden">展開</span>
          <span className="ml-auto hidden text-xs text-muted-foreground group-open:inline">
            收合
          </span>
        </summary>
        <nav aria-label="文章目錄（行動版）" className="mt-3">
          {renderList()}
        </nav>
      </details>
    )
  }

  return (
    <nav aria-label="文章目錄" className="sticky top-24 max-h-[calc(100svh-8rem)] overflow-y-auto">
      <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground">本文目錄</p>
      {renderList()}
    </nav>
  )
}
