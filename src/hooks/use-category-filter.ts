"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { useMemo } from "react"

import {
  CATEGORY_SEARCH_PARAM,
  countByCategory,
  matchesCategory,
  resolveCategorySelection,
  type CategorizedItem,
  type CategoryTreeNode,
} from "@/lib/content/category-filter"

// 篩選條件存放在網址查詢參數中，可分享、可重新整理，也支援瀏覽器上一頁
// 以 history.pushState 更新網址：Next.js 會同步 useSearchParams，但不會重新向伺服器請求資料
export function useCategoryFilter<T extends CategorizedItem>(
  items: readonly T[],
  tree: CategoryTreeNode[],
) {
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const selection = resolveCategorySelection(tree, searchParams.get(CATEGORY_SEARCH_PARAM))
  const activeSlug = selection.child?.slug ?? selection.parent?.slug ?? null

  const counts = useMemo(() => countByCategory(items), [items])
  const filteredItems = useMemo(
    () => (activeSlug ? items.filter((item) => matchesCategory(item, activeSlug)) : items),
    [items, activeSlug],
  )

  const selectCategory = (slug: string | null) => {
    const params = new URLSearchParams(searchParams)

    if (slug) params.set(CATEGORY_SEARCH_PARAM, slug)
    else params.delete(CATEGORY_SEARCH_PARAM)

    const query = params.toString()
    window.history.pushState(null, "", query ? `${pathname}?${query}` : pathname)
  }

  return { selection, counts, filteredItems, selectCategory }
}
