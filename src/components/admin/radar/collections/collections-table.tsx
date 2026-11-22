import { BookmarkIcon, DatabaseIcon } from "lucide-react"

import { CollectionsTableView } from "@/components/admin/radar/collections/collections-table-view"
import { EmptyState } from "@/components/empty-state"
import { listAdminRadarCollections } from "@/lib/data/admin-radar-collections"
import {
  ALL_FILTER,
  hasActiveCollectionFilters,
  parseRadarCollectionListParams,
} from "@/lib/validations/radar-collection"

type CollectionsTableProps = {
  searchParams: PageProps<"/admin/radar/collections">["searchParams"]
}

export async function CollectionsTable({ searchParams }: CollectionsTableProps) {
  const params = parseRadarCollectionListParams(await searchParams)
  const list = await listAdminRadarCollections(params)

  if (!list) {
    return (
      <EmptyState
        icon={DatabaseIcon}
        title="收藏資料表尚未建立"
        description="請先在 Supabase SQL Editor 執行 radar_collections 遷移檔，再回到榜單收藏項目。"
      />
    )
  }

  // 完全沒有收藏（也沒有篩選）時只顯示引導，不顯示空的狀態分頁
  if (list.statusCounts[ALL_FILTER] === 0 && !hasActiveCollectionFilters(params)) {
    return (
      <EmptyState
        icon={BookmarkIcon}
        title="還沒有任何收藏"
        description="到 GitHub、HN 或資安榜單，按下項目右側的「收藏」，就會出現在這裡。"
      />
    )
  }

  return <CollectionsTableView {...list} params={{ ...params, page: list.page }} />
}

export function CollectionsTableSkeleton() {
  return (
    <div
      className="h-96 animate-pulse rounded-xl border bg-muted/50"
      aria-busy
      aria-label="收藏列表載入中"
    />
  )
}
