"use client"

import { useMemo, useSyncExternalStore } from "react"

import {
  CATEGORY_SEARCH_PARAM,
  countByCategory,
  matchesCategory,
  resolveCategorySelection,
  type CategorizedItem,
  type CategoryTreeNode,
} from "@/lib/content/category-filter"

const CATEGORY_CHANGE_EVENT = "bryan-log:category-change"

function subscribeToSearch(onChange: () => void) {
  window.addEventListener("popstate", onChange)
  window.addEventListener(CATEGORY_CHANGE_EVENT, onChange)

  return () => {
    window.removeEventListener("popstate", onChange)
    window.removeEventListener(CATEGORY_CHANGE_EVENT, onChange)
  }
}

const getSearch = () => window.location.search
const getServerSearch = () => ""

// 篩選條件存放在網址查詢參數中，可分享、可重新整理，也支援瀏覽器上一頁
// 直接讀取 location 而非 useSearchParams：後者會讓頁面必須在請求時渲染，列表就無法由 CDN 直接回應。
// 伺服器與 hydration 期間一律輸出完整清單，帶篩選條件的網址在 hydration 後才套用
export function useCategoryFilter<T extends CategorizedItem>(
  items: readonly T[],
  tree: CategoryTreeNode[],
) {
  const search = useSyncExternalStore(subscribeToSearch, getSearch, getServerSearch)

  const selection = resolveCategorySelection(
    tree,
    new URLSearchParams(search).get(CATEGORY_SEARCH_PARAM),
  )
  const activeSlug = selection.child?.slug ?? selection.parent?.slug ?? null

  const counts = useMemo(() => countByCategory(items), [items])
  const filteredItems = useMemo(
    () => (activeSlug ? items.filter((item) => matchesCategory(item, activeSlug)) : items),
    [items, activeSlug],
  )

  const selectCategory = (slug: string | null) => {
    const params = new URLSearchParams(window.location.search)

    if (slug) params.set(CATEGORY_SEARCH_PARAM, slug)
    else params.delete(CATEGORY_SEARCH_PARAM)

    const query = params.toString()
    const { pathname } = window.location
    window.history.pushState(null, "", query ? `${pathname}?${query}` : pathname)
    window.dispatchEvent(new Event(CATEGORY_CHANGE_EVENT))
  }

  return { selection, counts, filteredItems, selectCategory }
}
