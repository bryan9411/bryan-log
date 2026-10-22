"use client"

import { useMemo, useRef, useState } from "react"
import { ListIcon } from "lucide-react"

import {
  Sheet,
  SHEET_SIDE,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
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
  // 抽屜開啟時頁面捲動被鎖定，點選的標題先記下，待抽屜關閉、解除鎖定後才捲動
  const pendingHeadingRef = useRef<string | null>(null)

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const activeText = items.find(({ id }) => id === activeId)?.text

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault()

    if (variant === TOC_VARIANT.DRAWER) {
      pendingHeadingRef.current = id
      setIsDrawerOpen(false)
      return
    }

    scrollToHeading(id)
  }

  // 關閉後 Radix 會把焦點還給懸浮按鈕；有選取標題時改為捲動到該段落，
  // 並延到下一個影格執行，確保捲動鎖定已解除
  const handleDrawerCloseAutoFocus = (event: Event) => {
    const id = pendingHeadingRef.current
    if (!id) return

    event.preventDefault()
    pendingHeadingRef.current = null
    window.requestAnimationFrame(() => scrollToHeading(id))
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

  if (variant === TOC_VARIANT.DRAWER) {
    return (
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label="開啟文章目錄"
            className="fixed right-4 bottom-5 z-40 flex h-11 max-w-[min(18rem,calc(100vw-2rem))] items-center gap-2 rounded-full border bg-popover/90 px-4 text-sm font-medium text-popover-foreground shadow-lg backdrop-blur-md transition-transform active:scale-95 lg:hidden"
          >
            <ListIcon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{activeText ?? "目錄"}</span>
          </button>
        </SheetTrigger>
        <SheetContent side={SHEET_SIDE.BOTTOM} className="site-theme" onCloseAutoFocus={handleDrawerCloseAutoFocus}>
          <SheetHeader>
            <SheetTitle>文章目錄</SheetTitle>
            <SheetDescription>點選章節即可跳轉</SheetDescription>
          </SheetHeader>
          <nav
            aria-label="文章目錄（行動版）"
            className="overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          >
            {renderList()}
          </nav>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <nav aria-label="文章目錄" className="sticky top-24 max-h-[calc(100svh-8rem)] overflow-y-auto">
      <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground">本文目錄</p>
      {renderList()}
    </nav>
  )
}
