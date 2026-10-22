"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Loader2Icon, SearchIcon, XIcon } from "lucide-react"

import { usePostListNavigation } from "@/components/admin/posts/post-list-navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  parseAdminPostListParams,
  POST_STATUS_FILTER_LABEL,
  postStatusFilterSchema,
  SEARCH_QUERY_MAX_LENGTH,
  type PostStatusFilter,
} from "@/lib/validations/admin-post-list"

const SEARCH_DEBOUNCE_MS = 350

const STATUS_FILTERS = postStatusFilterSchema.options

export function PostsToolbar() {
  const searchParams = useSearchParams()
  const { isPending, navigate } = usePostListNavigation()
  const debounceRef = useRef<number | undefined>(undefined)

  const params = parseAdminPostListParams(Object.fromEntries(searchParams))
  const [queryInput, setQueryInput] = useState(params.query)
  const [syncedQuery, setSyncedQuery] = useState(params.query)

  // 透過上一頁／下一頁改變網址時，將輸入框同步為網址上的關鍵字；
  // 自己送出的關鍵字只差在前後空白時不覆寫，避免打字途中游標跳動
  if (params.query !== syncedQuery) {
    setSyncedQuery(params.query)
    if (params.query !== queryInput.trim()) setQueryInput(params.query)
  }

  useEffect(() => () => window.clearTimeout(debounceRef.current), [])

  // 任何條件改變都回到第一頁；同時取消尚未送出的搜尋，避免舊的關鍵字覆蓋新的篩選
  const applyFilters = (next: { query?: string; status?: PostStatusFilter }) => {
    window.clearTimeout(debounceRef.current)

    const query = next.query ?? queryInput.trim()
    const status = next.status ?? params.status
    if (query === params.query && status === params.status) return

    navigate({ query, status, page: 1 })
  }

  const handleQueryChange = (value: string) => {
    setQueryInput(value)
    window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(
      () => applyFilters({ query: value.trim() }),
      SEARCH_DEBOUNCE_MS,
    )
  }

  const clearQuery = () => {
    setQueryInput("")
    applyFilters({ query: "" })
  }

  const renderSearchIcon = () => {
    if (isPending) {
      return <Loader2Icon className="size-4 animate-spin text-muted-foreground" aria-hidden />
    }
    return <SearchIcon className="size-4 text-muted-foreground" aria-hidden />
  }

  const maybeRenderClearButton = () => {
    if (!queryInput) return null

    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="absolute top-1/2 right-1.5 -translate-y-1/2"
        aria-label="清除搜尋"
        onClick={clearQuery}
      >
        <XIcon aria-hidden />
      </Button>
    )
  }

  const renderStatusButton = (status: PostStatusFilter) => {
    const isActive = status === params.status

    return (
      <button
        key={status}
        type="button"
        aria-pressed={isActive}
        onClick={() => applyFilters({ status })}
        className={cn(
          "h-7 rounded-md px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          isActive
            ? "bg-background text-foreground shadow-sm dark:bg-input/40"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {POST_STATUS_FILTER_LABEL[status]}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <form
        role="search"
        className="relative w-full sm:max-w-sm"
        onSubmit={(event) => {
          event.preventDefault()
          applyFilters({})
        }}
      >
        <span className="pointer-events-none absolute top-1/2 left-3 flex -translate-y-1/2">
          {renderSearchIcon()}
        </span>
        <Input
          type="search"
          value={queryInput}
          onChange={(event) => handleQueryChange(event.target.value)}
          maxLength={SEARCH_QUERY_MAX_LENGTH}
          placeholder="搜尋文章標題或網址代稱…"
          aria-label="搜尋文章"
          className="h-9 pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
        />
        {maybeRenderClearButton()}
      </form>
      <div
        role="group"
        aria-label="依狀態篩選"
        className="inline-flex w-fit items-center gap-1 rounded-lg bg-muted p-1"
      >
        {STATUS_FILTERS.map(renderStatusButton)}
      </div>
    </div>
  )
}

export function PostsToolbarSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Skeleton className="h-9 w-full sm:max-w-sm" />
      <Skeleton className="h-9 w-52" />
    </div>
  )
}
