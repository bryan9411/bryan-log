import { NewspaperIcon } from "lucide-react"

import { RadarItemTitle } from "@/components/admin/radar/radar-item-title"
import { RadarRankingTable } from "@/components/admin/radar/radar-ranking-table"
import { EmptyState } from "@/components/empty-state"
import { ExternalLink } from "@/components/site/external-link"
import { RADAR_RANKING_SIZE } from "@/config/radar"
import { formatDateTime, formatInteger } from "@/lib/format"
import type { HnRankingItem } from "@/lib/radar/ranking"

export function HnRankingTable({ items }: { items: HnRankingItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={NewspaperIcon}
        title="還沒有資料"
        description="可先到雷達總覽按「立即同步」抓取近 7 天的 Hacker News 貼文。"
      />
    )
  }

  return (
    <RadarRankingTable
      mode="ranking"
      rows={items}
      columns={[
        {
          key: "title",
          header: "標題",
          render: (item) => (
            <RadarItemTitle title={item.title} url={item.url} subtitle={item.domain} />
          ),
        },
        {
          key: "points",
          header: "分數",
          className: "w-20 text-right font-semibold tabular-nums",
          render: (item) => formatInteger(item.points),
        },
        {
          key: "comments",
          header: "留言",
          className: "w-20 text-right tabular-nums",
          render: (item) => (
            <ExternalLink href={item.hnUrl} className="hover:underline">
              {formatInteger(item.comments)}
            </ExternalLink>
          ),
        },
        {
          key: "postedAt",
          header: "發布時間",
          className: "w-44 text-muted-foreground",
          render: (item) => (item.postedAt ? formatDateTime(item.postedAt) : "—"),
        },
      ]}
      footer={`前台顯示前 ${RADAR_RANKING_SIZE} 名；淡色為遞補候選，隱藏上方項目後會依序遞補`}
    />
  )
}
