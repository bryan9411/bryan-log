"use client"

import { useMemo } from "react"
import { z } from "zod"

import {
  removeLocalStorage,
  useLocalStorageValue,
  writeLocalStorage,
} from "@/hooks/use-local-storage-value"

const RECENT_SEARCHES_STORAGE_KEY = "bryan-log-recent-searches"
const RECENT_SEARCHES_LIMIT = 6
const RECENT_SEARCH_MAX_LENGTH = 50

const recentSearchesSchema = z.array(z.string().max(RECENT_SEARCH_MAX_LENGTH))

// localStorage 內容可能被手動竄改或來自舊版格式，解析失敗時視為沒有紀錄
function parseRecentSearches(raw: string | null): string[] {
  if (!raw) return []

  try {
    const result = recentSearchesSchema.safeParse(JSON.parse(raw))
    return result.success ? result.data.slice(0, RECENT_SEARCHES_LIMIT) : []
  } catch {
    return []
  }
}

function saveRecentSearches(searches: string[]) {
  if (searches.length === 0) {
    removeLocalStorage(RECENT_SEARCHES_STORAGE_KEY)
    return
  }
  writeLocalStorage(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(searches))
}

// 最近搜尋紀錄只存在訪客自己的瀏覽器；最新的排最前面，重複的關鍵字會移到最前並去重
export function useRecentSearches() {
  const raw = useLocalStorageValue(RECENT_SEARCHES_STORAGE_KEY)
  const searches = useMemo(() => parseRecentSearches(raw), [raw])

  const addSearch = (query: string) => {
    const keyword = query.trim().slice(0, RECENT_SEARCH_MAX_LENGTH)
    if (!keyword) return

    const deduped = searches.filter((item) => item.toLowerCase() !== keyword.toLowerCase())
    saveRecentSearches([keyword, ...deduped].slice(0, RECENT_SEARCHES_LIMIT))
  }

  const removeSearch = (keyword: string) => {
    saveRecentSearches(searches.filter((item) => item !== keyword))
  }

  const clearSearches = () => saveRecentSearches([])

  return { searches, addSearch, removeSearch, clearSearches }
}
