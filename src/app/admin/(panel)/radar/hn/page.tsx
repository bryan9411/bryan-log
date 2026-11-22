import type { Metadata } from "next"
import { Suspense } from "react"

import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { BlockedItemsTable } from "@/components/admin/radar/blocked-items-table"
import { HnRankingTable } from "@/components/admin/radar/hn-ranking-table"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HN_TAB, HN_TAB_LABEL, RADAR_MODULE } from "@/config/radar"
import { getAdminHnRanking, listBlockedRadarItems } from "@/lib/data/admin-radar"

export const metadata: Metadata = {
  title: "HN 週榜",
}

const BLOCKED_TAB = "blocked"

async function HnAdminTabs() {
  const [ranking, blocked] = await Promise.all([
    getAdminHnRanking(),
    listBlockedRadarItems(RADAR_MODULE.HN),
  ])

  return (
    <Tabs defaultValue={HN_TAB.TOP} className="grid gap-4">
      <TabsList>
        <TabsTrigger value={HN_TAB.TOP}>{HN_TAB_LABEL[HN_TAB.TOP]}</TabsTrigger>
        <TabsTrigger value={HN_TAB.SHOW}>{HN_TAB_LABEL[HN_TAB.SHOW]}</TabsTrigger>
        <TabsTrigger value={BLOCKED_TAB}>已隱藏（{blocked.length}）</TabsTrigger>
      </TabsList>
      <TabsContent value={HN_TAB.TOP}>
        <HnRankingTable items={ranking.top} />
      </TabsContent>
      <TabsContent value={HN_TAB.SHOW}>
        <HnRankingTable items={ranking.show} />
      </TabsContent>
      <TabsContent value={BLOCKED_TAB}>
        <BlockedItemsTable items={blocked} />
      </TabsContent>
    </Tabs>
  )
}

export default function AdminRadarHnPage() {
  return (
    <>
      <AdminPageHeader
        title="HN 週榜"
        description="近 7 天 Hacker News 熱門討論與 Show HN，依分數排序；隱藏的項目前台會自動遞補"
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <HnAdminTabs />
      </Suspense>
    </>
  )
}
