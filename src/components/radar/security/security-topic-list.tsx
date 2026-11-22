"use client"

import { useState } from "react"

import { AdvisoryCard } from "@/components/radar/security/advisory-card"
import { KevCard } from "@/components/radar/security/kev-card"
import {
  SECURITY_RANKING_SIZE,
  SECURITY_TOPIC_RULES,
  SECURITY_TOPICS,
  type SecurityTopic,
} from "@/config/radar"
import {
  filterByTopic,
  type AdvisoryRankingItem,
  type KevRankingItem,
} from "@/lib/radar/security/ranking"
import { cn } from "@/lib/utils"

const ALL = "all"

type TopicValue = SecurityTopic | typeof ALL

const TOPIC_OPTIONS: Array<{ value: TopicValue; label: string }> = [
  { value: ALL, label: "全部" },
  ...SECURITY_TOPICS.map((topic) => ({ value: topic, label: SECURITY_TOPIC_RULES[topic].label })),
]

type SecurityTopicListProps =
  | { kind: "kev"; label: string; items: KevRankingItem[]; limit?: number }
  | { kind: "advisory"; label: string; items: AdvisoryRankingItem[]; limit?: number }

// 伺服器端預渲染全部候選，主題篩選在瀏覽器完成，頁面維持靜態外殼；篩選後取前 N 名
export function SecurityTopicList(props: SecurityTopicListProps) {
  const [topic, setTopic] = useState<TopicValue>(ALL)
  const limit = props.limit ?? SECURITY_RANKING_SIZE
  const activeTopic = topic === ALL ? null : topic

  const renderTopicButton = ({ value, label }: { value: TopicValue; label: string }) => {
    const isActive = topic === value
    return (
      <button
        key={value}
        type="button"
        aria-pressed={isActive}
        onClick={() => setTopic(value)}
        className={cn(
          "h-full rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
          isActive && "bg-background text-foreground shadow-sm",
        )}
      >
        {label}
      </button>
    )
  }

  const renderList = () => {
    const cards =
      props.kind === "kev"
        ? filterByTopic(props.items, activeTopic)
            .slice(0, limit)
            .map((item) => (
              <li key={item.id}>
                <KevCard item={item} />
              </li>
            ))
        : filterByTopic(props.items, activeTopic)
            .slice(0, limit)
            .map((item) => (
              <li key={item.id}>
                <AdvisoryCard item={item} />
              </li>
            ))

    if (cards.length === 0) {
      return (
        <p className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          {activeTopic ? "這個主題目前沒有上榜的漏洞。" : "資料同步中，稍後再回來看看。"}
        </p>
      )
    }

    // 與文章列表相同：卡片左右留白延伸到容器外，文字與標題對齊；依排名排序但不顯示名次
    return (
      <ol aria-label={props.label} className="-mx-4 sm:-mx-5">
        {cards}
      </ol>
    )
  }

  const filteredCount = filterByTopic<{ topics: SecurityTopic[] }>(props.items, activeTopic).length

  const maybeRenderCount = () => {
    if (filteredCount >= limit) return null
    return (
      <p className="text-sm text-muted-foreground tabular-nums" role="status">
        符合條件 {filteredCount} 筆
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div
        role="group"
        aria-label="主題"
        className="inline-flex h-10 w-fit max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-muted p-1 text-muted-foreground"
      >
        {TOPIC_OPTIONS.map(renderTopicButton)}
      </div>
      {maybeRenderCount()}
      {renderList()}
    </div>
  )
}
