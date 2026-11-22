import type { Metadata } from "next"
import { Suspense } from "react"
import { RadarIcon } from "lucide-react"

import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { RadarModuleCard } from "@/components/admin/radar/radar-module-card"
import { EmptyState } from "@/components/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { listAdminRadarModules } from "@/lib/data/admin-radar"
import { getRequestTime } from "@/lib/request-time"

export const metadata: Metadata = {
  title: "雷達總覽",
}

// 「立即同步」的 Server Action 沿用頁面的執行時間上限；GitHub 同步需要數十秒
export const maxDuration = 300

async function RadarModules() {
  const now = await getRequestTime()
  const modules = await listAdminRadarModules(now)

  if (modules.length === 0) {
    return (
      <EmptyState
        icon={RadarIcon}
        title="還沒有雷達模組"
        description="請先在 Supabase SQL Editor 執行 supabase/migrations/20261123_radar.sql。"
      />
    )
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {modules.map((radarModule) => (
        <RadarModuleCard key={radarModule.key} radarModule={radarModule} now={now} />
      ))}
    </div>
  )
}

export default function AdminRadarPage() {
  return (
    <>
      <AdminPageHeader
        title="雷達總覽"
        description="每天台灣時間 02:00（GitHub／HN）與 02:30（資安情資）左右由 Vercel Cron 自動同步；模組公開前前台一律回應 404"
      />
      <Suspense
        fallback={
          <div className="grid gap-6 xl:grid-cols-2">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        }
      >
        <RadarModules />
      </Suspense>
    </>
  )
}
