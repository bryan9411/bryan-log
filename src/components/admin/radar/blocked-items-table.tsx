import { EyeOffIcon } from "lucide-react"

import { RadarItemTitle } from "@/components/admin/radar/radar-item-title"
import { RadarRankingTable } from "@/components/admin/radar/radar-ranking-table"
import { EmptyState } from "@/components/empty-state"
import type { BlockedRadarItem } from "@/lib/data/admin-radar"
import { formatDateTime } from "@/lib/format"

type BlockedItemsTableProps = {
  items: BlockedRadarItem[]
  mono?: boolean
}

export function BlockedItemsTable({ items, mono = false }: BlockedItemsTableProps) {
  const hasReasons = items.some((item) => item.blockedReason)

  if (items.length === 0) {
    return (
      <EmptyState
        icon={EyeOffIcon}
        title="沒有隱藏的項目"
        description="在「目前榜單」按下「隱藏」或被排除關鍵字命中的項目會出現在這裡。"
      />
    )
  }

  return (
    <RadarRankingTable
      mode="blocked"
      minWidth="min-w-[720px]"
      rows={items}
      columns={[
        {
          key: "title",
          header: "項目",
          render: (item) => (
            <RadarItemTitle title={item.title} url={item.url} subtitle={item.summary} mono={mono} />
          ),
        },
        ...(hasReasons
          ? [
              {
                key: "reason",
                header: "原因",
                className: "w-48 text-muted-foreground",
                render: (item: BlockedRadarItem) => item.blockedReason ?? "手動隱藏",
              },
            ]
          : []),
        {
          key: "blockedAt",
          header: "隱藏時間",
          className: "w-48 text-muted-foreground",
          render: (item) => (item.blockedAt ? formatDateTime(item.blockedAt) : "—"),
        },
      ]}
      footer={`共 ${items.length} 個已隱藏項目；還原後會依數據回到原本的名次`}
    />
  )
}
