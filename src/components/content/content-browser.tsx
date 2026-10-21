"use client"

import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { CategoryFilter } from "@/components/content/category-filter"
import { EmptyState } from "@/components/empty-state"
import { useCategoryFilter } from "@/hooks/use-category-filter"
import type { CategorizedItem, CategoryTreeNode } from "@/lib/content/category-filter"

type ContentBrowserProps<T extends CategorizedItem> = {
  items: readonly T[]
  categories: CategoryTreeNode[]
  unit: string
  emptyIcon: LucideIcon
  emptyTitle: string
  emptyDescription: string
  children: (filteredItems: readonly T[]) => ReactNode
}

// 文章與作品列表共用：分類篩選、結果數量與空狀態，清單本身由呼叫端決定呈現方式
export function ContentBrowser<T extends CategorizedItem>({
  items,
  categories,
  unit,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  children,
}: ContentBrowserProps<T>) {
  const { selection, counts, filteredItems, selectCategory } = useCategoryFilter(items, categories)

  const activeName = selection.child?.name ?? selection.parent?.name

  if (items.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div className="flex flex-col gap-6">
      <CategoryFilter
        tree={categories}
        counts={counts}
        total={items.length}
        selection={selection}
        onSelect={selectCategory}
      />
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {activeName ? `「${activeName}」共 ` : "共 "}
        <span className="font-medium text-foreground tabular-nums">
          {filteredItems.length}
        </span>{" "}
        {unit}
      </p>
      {children(filteredItems)}
    </div>
  )
}
