import type { Metadata } from "next"
import { Suspense } from "react"

import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { CollectionListNavigationProvider } from "@/components/admin/radar/collections/collection-list-navigation"
import {
  CollectionsTable,
  CollectionsTableSkeleton,
} from "@/components/admin/radar/collections/collections-table"
import {
  CollectionsToolbar,
  CollectionsToolbarSkeleton,
} from "@/components/admin/radar/collections/collections-toolbar"
import { listRadarCollectionTags } from "@/lib/data/admin-radar-collections"

export const metadata: Metadata = {
  title: "收藏",
}

async function CollectionsToolbarLoader() {
  const tags = await listRadarCollectionTags()
  return <CollectionsToolbar tags={tags} />
}

export default function AdminRadarCollectionsPage({
  searchParams,
}: PageProps<"/admin/radar/collections">) {
  return (
    <>
      <AdminPageHeader
        title="收藏"
        description="從雷達榜單收藏的項目：記錄研究狀態、筆記與標籤，並對照收藏當下與最新的數據"
      />
      {/* 搜尋列與表格分屬不同 Suspense：切換條件時搜尋框保持掛載，輸入不會中斷 */}
      <CollectionListNavigationProvider>
        <div className="grid gap-4">
          <Suspense fallback={<CollectionsToolbarSkeleton />}>
            <CollectionsToolbarLoader />
          </Suspense>
          <Suspense fallback={<CollectionsTableSkeleton />}>
            <CollectionsTable searchParams={searchParams} />
          </Suspense>
        </div>
      </CollectionListNavigationProvider>
    </>
  )
}
