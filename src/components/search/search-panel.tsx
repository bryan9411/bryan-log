"use client"

import { useRouter } from "next/navigation"
import { useEffect, useId, useRef, useState } from "react"
import {
  CornerDownLeftIcon,
  FileTextIcon,
  HashIcon,
  HistoryIcon,
  Loader2Icon,
  SearchIcon,
  XIcon,
} from "lucide-react"

import { postDetailPath } from "@/config/routes"
import { useRecentSearches } from "@/hooks/use-recent-searches"
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
  const { searches: recentSearches, addSearch, removeSearch, clearSearches } = useRecentSearches()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const listboxId = useId()

  const isReady = index.status === SEARCH_INDEX_STATUS.READY
  const entries = isReady ? index.entries : []
  const popularTags = isReady ? index.popularTags : []
  const hasQuery = query.trim().length > 0
  const results = hasQuery
    ? searchEntries(entries, query).slice(0, MAX_RESULTS)
    : entries.slice(0, LATEST_ENTRIES_LIMIT).map((entry) => ({ entry, highlights: [] }))
  const activeResult = results[activeIndex]
  const activeEntry = activeResult?.entry
  const activeSlug = activeEntry?.slug
  const getOptionId = (slug: string) => `${listboxId}-${slug}`

  // 預先載入目前選取的文章，按下 Enter 時幾乎可以立即切換頁面
  useEffect(() => {
    if (activeEntry) router.prefetch(postDetailPath(activeEntry.sectionSlug, activeEntry.slug))
  }, [activeEntry, router])

  const changeQuery = (value: string) => {
    setQuery(value)
    setActiveIndex(0)
  }

  // 點選熱門標籤或最近搜尋後把焦點還給輸入框，可直接用方向鍵與 Enter 開啟結果
  const applyKeyword = (keyword: string) => {
    changeQuery(keyword)
    inputRef.current?.focus()
  }

  // 只有實際開啟文章的搜尋才記錄，避免把打到一半的字也存成紀錄
  const openEntry = (entry: SearchEntry) => {
    if (hasQuery) addSearch(query)
    onNavigate()
    router.push(postDetailPath(entry.sectionSlug, entry.slug))
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

  const renderSectionLabel = (label: string) => (
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
  )

  const maybeRenderRecentSearches = () => {
    if (recentSearches.length === 0) return null

    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          {renderSectionLabel("最近搜尋")}
          <button
            type="button"
            onClick={clearSearches}
            className="rounded text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            清除紀錄
          </button>
        </div>
        <ul className="flex flex-wrap gap-1.5">
          {recentSearches.map((keyword) => (
            <li
              key={keyword}
              className="flex items-center rounded-full border bg-background text-sm transition-colors hover:border-ring/60"
            >
              <button
                type="button"
                onClick={() => applyKeyword(keyword)}
                className="flex items-center gap-1.5 rounded-full py-1 pr-1 pl-2.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <HistoryIcon className="size-3.5 text-muted-foreground" aria-hidden />
                {keyword}
              </button>
              <button
                type="button"
                aria-label={`移除搜尋紀錄「${keyword}」`}
                title="移除"
                onClick={() => removeSearch(keyword)}
                className="mr-1 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <XIcon className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const maybeRenderPopularTags = () => {
    if (popularTags.length === 0) return null

    return (
      <div className="flex flex-col gap-2">
        {renderSectionLabel("熱門標籤")}
        <ul className="flex flex-wrap gap-1.5">
          {popularTags.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                onClick={() => applyKeyword(tag)}
                className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-sm transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <HashIcon className="size-3.5 text-muted-foreground" aria-hidden />
                {tag}
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  // 尚未輸入關鍵字時，在最新文章上方提供可快速點選的關鍵字
  const maybeRenderQuickPicks = () => {
    if (hasQuery || !isReady) return null
    if (recentSearches.length === 0 && popularTags.length === 0) return null

    return (
      <div className="flex flex-col gap-4 border-b px-4 py-4">
        {maybeRenderRecentSearches()}
        {maybeRenderPopularTags()}
      </div>
    )
  }

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
                    {`${entry.sectionName}・${entry.categoryPath ?? "未分類"}・約 ${entry.readingMinutes} 分鐘閱讀`}
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
          ref={inputRef}
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
          onChange={(event) => changeQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
        />
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {maybeRenderQuickPicks()}
        {renderResults()}
      </div>
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
