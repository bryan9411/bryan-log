import type { Metadata } from "next"
import { Suspense } from "react"

import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { BlockedItemsTable } from "@/components/admin/radar/blocked-items-table"
import { GithubRankingTable } from "@/components/admin/radar/github-ranking-table"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RADAR_MODULE } from "@/config/radar"
import { getAdminGithubRanking, listBlockedRadarItems } from "@/lib/data/admin-radar"

export const metadata: Metadata = {
  title: "GitHub 週榜",
}

const TAB = { RANKING: "ranking", BLOCKED: "blocked" } as const

async function GithubAdminTabs() {
  const [ranking, blocked] = await Promise.all([
    getAdminGithubRanking(),
    listBlockedRadarItems(RADAR_MODULE.GITHUB),
  ])

  return (
    <Tabs defaultValue={TAB.RANKING} className="grid gap-4">
      <TabsList>
        <TabsTrigger value={TAB.RANKING}>目前榜單（前 {ranking.items.length} 名）</TabsTrigger>
        <TabsTrigger value={TAB.BLOCKED}>已隱藏（{blocked.length}）</TabsTrigger>
      </TabsList>
      <TabsContent value={TAB.RANKING}>
        <GithubRankingTable ranking={ranking} />
      </TabsContent>
      <TabsContent value={TAB.BLOCKED}>
        <BlockedItemsTable items={blocked} mono />
      </TabsContent>
    </Tabs>
  )
}

export default function AdminRadarGithubPage() {
  return (
    <>
      <AdminPageHeader
        title="GitHub 週榜"
        description="近 7 天新增 star 數排名；隱藏不適合的 repo（例如疑似灌星），前台會自動遞補"
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <GithubAdminTabs />
      </Suspense>
    </>
  )
}
