import Link from "next/link"
import { ArrowRightIcon, TriangleAlertIcon } from "lucide-react"

import { RadarSyncForm } from "@/components/admin/radar/radar-sync-form"
import { RadarVisibilitySwitch } from "@/components/admin/radar/radar-visibility-switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RADAR_MODULE_META, RADAR_STALE_HOURS } from "@/config/radar"
import type { AdminRadarModule } from "@/lib/data/admin-radar"
import { formatDateTime, formatInteger, formatRelativeTime } from "@/lib/format"

const HOUR_MS = 60 * 60 * 1000

type RadarModuleCardProps = {
  radarModule: AdminRadarModule
  now: number
}

export function RadarModuleCard({ radarModule, now }: RadarModuleCardProps) {
  const meta = RADAR_MODULE_META[radarModule.key]
  const { lastSyncedAt, lastSyncStatus, lastSyncError } = radarModule
  const isStale =
    !lastSyncedAt || now - new Date(lastSyncedAt).getTime() > RADAR_STALE_HOURS * HOUR_MS

  const renderStatusBadge = () => {
    if (lastSyncStatus === "failed") return <Badge variant="destructive">同步失敗</Badge>
    if (lastSyncStatus === "success") return <Badge variant="secondary">同步成功</Badge>
    return <Badge variant="outline">尚未同步</Badge>
  }

  const maybeRenderStaleWarning = () => {
    if (!isStale) return null
    return (
      <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
        <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        {lastSyncedAt
          ? `已超過 ${RADAR_STALE_HOURS} 小時沒有成功同步，請到 Vercel Logs 查看排程是否失敗`
          : "還沒有成功同步過，可先按「立即同步」確認環境變數與 API 設定"}
      </p>
    )
  }

  const maybeRenderError = () => {
    if (lastSyncStatus !== "failed" || !lastSyncError) return null
    return (
      <details className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
        <summary className="cursor-pointer text-destructive">查看錯誤訊息</summary>
        <pre className="mt-2 font-mono text-xs break-all whitespace-pre-wrap text-destructive/90">
          {lastSyncError}
        </pre>
      </details>
    )
  }

  const stats = [
    { label: "候選池", value: formatInteger(radarModule.itemCount) },
    ...(radarModule.todaySnapshotCount === null
      ? []
      : [{ label: "今日快照", value: formatInteger(radarModule.todaySnapshotCount) }]),
    { label: "已隱藏", value: formatInteger(radarModule.blockedCount) },
  ]

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1.5">
          <CardTitle className="flex items-center gap-2">
            {radarModule.name}
            {renderStatusBadge()}
          </CardTitle>
          <CardDescription>
            最後成功同步：
            {lastSyncedAt ? (
              <time dateTime={lastSyncedAt} title={formatDateTime(lastSyncedAt)}>
                {formatRelativeTime(lastSyncedAt, now)}（{formatDateTime(lastSyncedAt)}）
              </time>
            ) : (
              "尚無紀錄"
            )}
          </CardDescription>
        </div>
        <RadarVisibilitySwitch
          moduleKey={radarModule.key}
          label={radarModule.name}
          visibility={radarModule.visibility}
        />
      </CardHeader>
      <CardContent className="grid gap-4">
        {maybeRenderStaleWarning()}
        {maybeRenderError()}
        <dl className="grid grid-cols-3 gap-3">
          {stats.map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-muted/50 px-3 py-2.5">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-xl font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <RadarSyncForm moduleKey={radarModule.key} />
          <Link
            href={meta.adminPath}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            管理榜單
            <ArrowRightIcon className="size-4" aria-hidden />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
