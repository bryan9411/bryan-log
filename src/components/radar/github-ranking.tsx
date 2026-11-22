"use client"

import { useState } from "react"

import { GithubRankCard } from "@/components/radar/github-rank-card"
import { GITHUB_CATEGORIES, GITHUB_CATEGORY_RULES, RADAR_RANKING_SIZE } from "@/config/radar"
import type { GithubRankingItem } from "@/lib/radar/ranking"
import { cn } from "@/lib/utils"

const ALL = "all"

type GithubRankingProps = {
  items: GithubRankingItem[]
}

const CATEGORY_OPTIONS = [
  { value: ALL, label: "全部" },
  ...GITHUB_CATEGORIES.map((key) => ({ value: key, label: GITHUB_CATEGORY_RULES[key].label })),
]

// 伺服器端預渲染全部候選，分類篩選在瀏覽器完成，頁面維持靜態外殼；篩選後取前 N 名
export function GithubRanking({ items }: GithubRankingProps) {
  const [category, setCategory] = useState<string>(ALL)

  const filtered =
    category === ALL
      ? items
      : items.filter((item) => (item.categories as string[]).includes(category))
  const visible = filtered.slice(0, RADAR_RANKING_SIZE)

  const renderCategoryButton = ({ value, label }: { value: string; label: string }) => {
    const isActive = category === value
    return (
      <button
        key={value}
        type="button"
        aria-pressed={isActive}
        onClick={() => setCategory(value)}
        className={cn(
          "h-full rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
          isActive && "bg-background text-foreground shadow-sm",
        )}
      >
        {label}
      </button>
    )
  }

  const renderResults = () => {
    if (visible.length === 0) {
      return (
        <p className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          這個分類本週還沒有上榜的專案。
        </p>
      )
    }

    // 與文章列表相同：卡片左右留白延伸到容器外，文字與標題對齊；依排名排序但不顯示名次
    return (
      <ol aria-label="GitHub 週榜" className="-mx-4 sm:-mx-5">
        {visible.map((item) => (
          <li key={item.id}>
            <GithubRankCard item={item} />
          </li>
        ))}
      </ol>
    )
  }

  const maybeRenderCount = () => {
    if (filtered.length >= RADAR_RANKING_SIZE) return null
    return (
      <p className="text-sm text-muted-foreground tabular-nums" role="status">
        符合條件 {filtered.length} 筆
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div
        role="group"
        aria-label="分類"
        className="inline-flex h-10 w-fit max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-muted p-1 text-muted-foreground"
      >
        {CATEGORY_OPTIONS.map(renderCategoryButton)}
      </div>
      {maybeRenderCount()}
      {renderResults()}
    </div>
  )
}
