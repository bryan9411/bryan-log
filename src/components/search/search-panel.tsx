"use client"

import { useRouter } from "next/navigation"
import { useEffect, useId, useState } from "react"
import { CornerDownLeftIcon, FileTextIcon, Loader2Icon, SearchIcon } from "lucide-react"

import { postDetailPath } from "@/config/routes"
import { SEARCH_INDEX_STATUS, useSearchIndex } from "@/hooks/use-search-index"
import { searchEntries, type HighlightRange } from "@/lib/search/fuzzy-search"
import type { SearchEntry } from "@/lib/search/types"
import { cn } from "@/lib/utils"

const LATEST_ENTRIES_LIMIT = 6
const MAX_RESULTS = 20

const KEY = {
  ARROW_DOWN: "ArrowDown",
  ARROW_UP: "ArrowUp",
  ENTER: "Enter",
} as const

type SearchPanelProps = {
  onNavigate: () => void
}

function renderHighlightedTitle(title: string, highlights: HighlightRange[]) {
  if (highlights.length === 0) return title

  const parts: React.ReactNode[] = []
  let cursor = 0

  highlights.forEach(([start, end]) => {
    if (start > cursor) parts.push(title.slice(cursor, start))
    parts.push(
      <mark key={start} className="rounded-sm bg-amber-200/70 text-inherit dark:bg-amber-400/30">
        {title.slice(start, end)}
      </mark>,
    )
    cursor = end
  })

  parts.push(title.slice(cursor))
  return parts
}

export function SearchPanel({ onNavigate }: SearchPanelProps) {
  const router = useRouter()
  const index = useSearchIndex()
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const listboxId = useId()

  const entries = index.status === SEARCH_INDEX_STATUS.READY ? index.entries : []
  const hasQuery = query.trim().length > 0
  const results = hasQuery
    ? searchEntries(entries, query).slice(0, MAX_RESULTS)
    : entries.slice(0, LATEST_ENTRIES_LIMIT).map((entry) => ({ entry, highlights: [] }))
  const activeResult = results[activeIndex]
  const activeSlug = activeResult?.entry.slug
  const getOptionId = (slug: string) => `${listboxId}-${slug}`

  // 預先載入目前選取的文章，按下 Enter 時幾乎可以立即切換頁面
  useEffect(() => {
    if (activeSlug) router.prefetch(postDetailPath(activeSlug))
  }, [activeSlug, router])

  const openEntry = (entry: SearchEntry) => {
    onNavigate()
    router.push(postDetailPath(entry.slug))
  }

  const moveActive = (step: number) => {
    if (results.length === 0) return
    const next = (activeIndex + step + results.length) % results.length
    setActiveIndex(next)
    document
      .getElementById(getOptionId(results[next].entry.slug))
      ?.scrollIntoView({ block: "nearest" })
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // 中文輸入法選字時的 Enter 與方向鍵屬於輸入法，不可攔截
    if (event.nativeEvent.isComposing) return

    if (event.key === KEY.ARROW_DOWN) {
      event.preventDefault()
      moveActive(1)
    } else if (event.key === KEY.ARROW_UP) {
      event.preventDefault()
      moveActive(-1)
    } else if (event.key === KEY.ENTER && activeResult) {
      event.preventDefault()
      openEntry(activeResult.entry)
    }
  }

  const renderStatus = (message: string, isLoading = false) => (
    <p className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-muted-foreground">
      {isLoading && <Loader2Icon className="size-4 animate-spin" aria-hidden />}
      {message}
    </p>
  )

  const renderResults = () => {
    if (index.status === SEARCH_INDEX_STATUS.LOADING) return renderStatus("載入文章索引中⋯⋯", true)
    if (index.status === SEARCH_INDEX_STATUS.ERROR) {
      return renderStatus("搜尋索引載入失敗，請關閉後再試一次")
    }
    if (results.length === 0) {
      return renderStatus(hasQuery ? `找不到符合「${query.trim()}」的文章` : "目前還沒有文章")
    }

    return (
      <div className="flex flex-col gap-1 p-2">
        <p className="px-2 pt-1 pb-1.5 text-xs font-medium text-muted-foreground">
          {hasQuery ? `${results.length} 筆結果` : "最新文章"}
        </p>
        <ul id={listboxId} role="listbox" aria-label="搜尋結果">
          {results.map(({ entry, highlights }, resultIndex) => {
            const isActive = resultIndex === activeIndex

            return (
              <li
                key={entry.slug}
                id={getOptionId(entry.slug)}
                role="option"
                aria-selected={isActive}
                onMouseMove={() => setActiveIndex(resultIndex)}
                onClick={() => openEntry(entry)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5",
                  isActive && "bg-muted",
                )}
              >
                <FileTextIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium">
                    {renderHighlightedTitle(entry.title, highlights)}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {entry.categoryPath ?? "未分類"}・約 {entry.readingMinutes} 分鐘
                  </span>
                </div>
                <CornerDownLeftIcon
                  className={cn("size-4 shrink-0 text-muted-foreground", !isActive && "invisible")}
                  aria-hidden
                />
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  return (
    <div className="flex max-h-[min(32rem,calc(100svh-6rem))] flex-col">
      <div className="flex items-center gap-3 border-b px-4">
        <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          type="search"
          role="combobox"
          aria-expanded
          aria-controls={listboxId}
          aria-activedescendant={activeSlug ? getOptionId(activeSlug) : undefined}
          aria-autocomplete="list"
          aria-label="搜尋文章"
          placeholder="輸入標題或分類，例如：React、資安"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setActiveIndex(0)
          }}
          onKeyDown={handleKeyDown}
          className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
        />
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain">{renderResults()}</div>
      <div className="flex items-center gap-4 border-t px-4 py-2.5 text-xs text-muted-foreground">
        <span>
          <kbd className="font-sans">↑</kbd> <kbd className="font-sans">↓</kbd> 選擇
        </span>
        <span>
          <kbd className="font-sans">Enter</kbd> 開啟
        </span>
        <span>
          <kbd className="font-sans">Esc</kbd> 關閉
        </span>
      </div>
    </div>
  )
}
