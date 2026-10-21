"use client"

import type {
  CategoryOption,
  CategorySelection,
  CategoryTreeNode,
} from "@/lib/content/category-filter"
import { cn } from "@/lib/utils"

type FilterChipProps = {
  label: string
  count: number
  isActive: boolean
  onClick: () => void
}

function FilterChip({ label, count, isActive, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        isActive
          ? "border-foreground bg-foreground text-background"
          : "border-foreground/10 bg-foreground/[0.04] text-foreground/75 hover:bg-foreground/[0.08] hover:text-foreground",
      )}
    >
      {label}
      <span className={cn("text-xs tabular-nums", isActive ? "opacity-70" : "opacity-55")}>
        {count}
      </span>
    </button>
  )
}

type CategoryFilterProps = {
  tree: CategoryTreeNode[]
  counts: Map<string, number>
  total: number
  selection: CategorySelection
  onSelect: (slug: string | null) => void
}

// 雙層篩選：第一列為父分類，選取父分類後才展開第二列子分類；沒有內容的分類不顯示
export function CategoryFilter({ tree, counts, total, selection, onSelect }: CategoryFilterProps) {
  const getCount = ({ slug }: CategoryOption) => counts.get(slug) ?? 0
  const visibleParents = tree.filter((parent) => getCount(parent) > 0)

  const maybeRenderChildRow = () => {
    const { parent, child } = selection
    if (!parent) return null

    const visibleChildren = parent.children.filter((option) => getCount(option) > 0)
    if (visibleChildren.length === 0) return null

    return (
      <div
        role="group"
        aria-label={`${parent.name}的子分類`}
        className="flex flex-wrap gap-2 border-l-2 border-foreground/10 pl-3"
      >
        <FilterChip
          label={`全部${parent.name}`}
          count={getCount(parent)}
          isActive={!child}
          onClick={() => onSelect(parent.slug)}
        />
        {visibleChildren.map((option) => (
          <FilterChip
            key={option.id}
            label={option.name}
            count={getCount(option)}
            isActive={child?.id === option.id}
            onClick={() => onSelect(option.slug)}
          />
        ))}
      </div>
    )
  }

  if (visibleParents.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="分類篩選" className="flex flex-wrap gap-2">
        <FilterChip
          label="全部"
          count={total}
          isActive={!selection.parent}
          onClick={() => onSelect(null)}
        />
        {visibleParents.map((parent) => (
          <FilterChip
            key={parent.id}
            label={parent.name}
            count={getCount(parent)}
            isActive={selection.parent?.id === parent.id}
            onClick={() => onSelect(parent.slug)}
          />
        ))}
      </div>
      {maybeRenderChildRow()}
    </div>
  )
}
