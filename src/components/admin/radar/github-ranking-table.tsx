import { StarIcon } from "lucide-react"

import { RadarItemTitle } from "@/components/admin/radar/radar-item-title"
import { RadarRankingTable } from "@/components/admin/radar/radar-ranking-table"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { GITHUB_CATEGORY_RULES, RADAR_RANKING_SIZE, RADAR_WINDOW_DAYS } from "@/config/radar"
import { formatCompactNumber, formatInteger } from "@/lib/format"
import type { GithubRanking } from "@/lib/radar/ranking"

const muted = <span className="text-muted-foreground">—</span>

export function GithubRankingTable({ ranking }: { ranking: GithubRanking }) {
  if (ranking.items.length === 0) {
    return (
      <EmptyState
        icon={StarIcon}
        title="還沒有排名資料"
        description="需要至少兩天的快照才算得出 star 增量；可先到雷達總覽按「立即同步」。"
      />
    )
  }

  const accumulating =
    ranking.windowDays < RADAR_WINDOW_DAYS
      ? `（資料累積中，已有 ${ranking.windowDays + 1} 天快照）`
      : ""

  return (
    <RadarRankingTable
      mode="ranking"
      minWidth="min-w-[1100px]"
      rows={ranking.items.map((item) => ({ ...item, title: item.fullName }))}
      columns={[
        {
          key: "repo",
          header: "Repo",
          render: (item) => (
            <RadarItemTitle title={item.fullName} url={item.url} subtitle={item.description} mono />
          ),
        },
        {
          key: "categories",
          header: "分類",
          className: "w-44",
          render: (item) =>
            item.categories.length === 0 ? (
              muted
            ) : (
              <div className="flex flex-wrap gap-1">
                {item.categories.map((category) => (
                  <Badge key={category} variant="tag" className="font-normal">
                    {GITHUB_CATEGORY_RULES[category].label}
                  </Badge>
                ))}
              </div>
            ),
        },
        {
          key: "language",
          header: "語言",
          className: "w-32",
          render: (item) => item.language ?? muted,
        },
        {
          key: "weekly",
          header: "本週 +star",
          className: "w-28 text-right font-semibold tabular-nums",
          render: (item) => `+${formatInteger(item.weeklyStars)}`,
        },
        {
          key: "total",
          header: "總 star",
          className: "w-24 text-right tabular-nums",
          render: (item) => formatCompactNumber(item.totalStars),
        },
        {
          key: "license",
          header: "授權",
          className: "w-28 font-mono text-xs",
          render: (item) => item.license ?? muted,
        },
        {
          key: "npm",
          header: "npm 週下載",
          className: "w-28 text-right tabular-nums",
          render: (item) =>
            item.npmWeeklyDownloads === null ? (
              muted
            ) : (
              <span title={item.npmPackage ?? undefined}>
                {formatCompactNumber(item.npmWeeklyDownloads)}
              </span>
            ),
        },
      ]}
      footer={`前台顯示前 ${RADAR_RANKING_SIZE} 名${accumulating}；淡色為遞補候選，隱藏上方項目後會依序遞補`}
    />
  )
}
