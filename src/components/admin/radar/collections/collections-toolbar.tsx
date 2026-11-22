"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Loader2Icon, SearchIcon, XIcon } from "lucide-react"

import { useCollectionListNavigation } from "@/components/admin/radar/collections/collection-list-navigation"
import { NativeSelect } from "@/components/forms/native-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { RADAR_MODULE_KEYS, RADAR_MODULE_META } from "@/config/radar"
import {
  ALL_FILTER,
  parseRadarCollectionListParams,
  RADAR_COLLECTION_SEARCH_MAX_LENGTH,
  type AdminRadarCollectionListParams,
  type RadarCollectionModuleFilter,
} from "@/lib/validations/radar-collection"

const SEARCH_DEBOUNCE_MS = 350

type CollectionsToolbarProps = {
  // 所有收藏用過的標籤（依使用次數排序）
  tags: string[]
}

export function CollectionsToolbar({ tags }: CollectionsToolbarProps) {
  const searchParams = useSearchParams()
  const { isPending, navigate } = useCollectionListNavigation()
  const debounceRef = useRef<number | undefined>(undefined)

  const params = parseRadarCollectionListParams(Object.fromEntries(searchParams))
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
  const applyFilters = (next: Partial<Omit<AdminRadarCollectionListParams, "page">>) => {
    window.clearTimeout(debounceRef.current)

    const target = { ...params, query: queryInput.trim(), ...next, page: 1 }
    if (
      target.query === params.query &&
      target.module === params.module &&
      target.tag === params.tag
    ) {
      return
    }

    navigate(target)
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

  // 網址上的標籤可能已從所有收藏移除，仍列為選項，讓選單顯示目前的篩選
  const tagOptions = params.tag && !tags.includes(params.tag) ? [params.tag, ...tags] : tags

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

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
          maxLength={RADAR_COLLECTION_SEARCH_MAX_LENGTH}
          placeholder="搜尋收藏標題…"
          aria-label="搜尋收藏標題"
          className="h-9 pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
        />
        {maybeRenderClearButton()}
      </form>
      <div className="grid grid-cols-2 gap-3 sm:flex">
        <NativeSelect
          aria-label="依模組篩選"
          value={params.module}
          onChange={(event) =>
            applyFilters({ module: event.target.value as RadarCollectionModuleFilter })
          }
          className="sm:w-44"
        >
          <option value={ALL_FILTER}>全部模組</option>
          {RADAR_MODULE_KEYS.map((key) => (
            <option key={key} value={key}>
              {RADAR_MODULE_META[key].label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="依標籤篩選"
          value={params.tag}
          onChange={(event) => applyFilters({ tag: event.target.value })}
          disabled={tagOptions.length === 0}
          className="sm:w-44"
        >
          <option value="">{tagOptions.length === 0 ? "尚無標籤" : "全部標籤"}</option>
          {tagOptions.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </NativeSelect>
      </div>
    </div>
  )
}

export function CollectionsToolbarSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Skeleton className="h-9 w-full sm:max-w-sm" />
      <div className="grid grid-cols-2 gap-3 sm:flex">
        <Skeleton className="h-9 sm:w-44" />
        <Skeleton className="h-9 sm:w-44" />
      </div>
    </div>
  )
}
