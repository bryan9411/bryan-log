"use client"

import { useEffect, useState } from "react"

import { API_ROUTES } from "@/config/routes"
import type { SearchEntry, SearchIndexResponse } from "@/lib/search/types"

export const SEARCH_INDEX_STATUS = {
  LOADING: "loading",
  READY: "ready",
  ERROR: "error",
} as const

export type SearchIndexState =
  | { status: typeof SEARCH_INDEX_STATUS.LOADING }
  | { status: typeof SEARCH_INDEX_STATUS.READY; entries: SearchEntry[] }
  | { status: typeof SEARCH_INDEX_STATUS.ERROR }

// 同一頁面生命週期內只下載一次索引，之後再開啟搜尋面板會直接使用
let indexPromise: Promise<SearchEntry[]> | null = null

function loadSearchIndex() {
  indexPromise ??= fetch(API_ROUTES.SEARCH_INDEX)
    .then((response) => {
      if (!response.ok) throw new Error(`搜尋索引載入失敗：${response.status}`)
      return response.json() as Promise<SearchIndexResponse>
    })
    .then(({ entries }) => entries)
    .catch((error: unknown) => {
      // 失敗時清除快取，下次開啟面板會重新嘗試
      indexPromise = null
      throw error
    })

  return indexPromise
}

// 只在搜尋面板第一次開啟時才下載索引，不增加一般頁面的載入成本
export function useSearchIndex(): SearchIndexState {
  const [state, setState] = useState<SearchIndexState>({ status: SEARCH_INDEX_STATUS.LOADING })

  useEffect(() => {
    let isActive = true

    loadSearchIndex().then(
      (entries) => isActive && setState({ status: SEARCH_INDEX_STATUS.READY, entries }),
      () => isActive && setState({ status: SEARCH_INDEX_STATUS.ERROR }),
    )

    return () => {
      isActive = false
    }
  }, [])

  return state
}

export function preloadSearchIndex() {
  loadSearchIndex().catch(() => {
    // 預先載入失敗不需處理，開啟面板時會再試一次並顯示錯誤
  })
}
