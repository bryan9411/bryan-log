import type { Metadata } from "next"
import { Suspense } from "react"
import { CircleAlertIcon } from "lucide-react"

import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { StatCard, StatCardSkeleton } from "@/components/admin/stat-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatBytes, formatDateTime } from "@/lib/format"
import { ORPHAN_GRACE_PERIOD_HOURS } from "@/lib/storage/constants"
import { scanOrphanFiles, type OrphanScanReport } from "@/lib/storage/orphan-cleaner"

import { CleanupForm } from "./cleanup-form"

export const metadata: Metadata = {
  title: "空間清理",
}

const ORPHAN_PREVIEW_LIMIT = 50
const STAT_SKELETON_COUNT = 4

async function StorageReport() {
  let report: OrphanScanReport

  try {
    report = await scanOrphanFiles()
  } catch (error) {
    const reason = error instanceof Error ? error.message : "未知錯誤"

    return (
      <div
        role="alert"
        className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
      >
        <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>掃描失敗，為避免誤刪已停止清理作業。{reason}</span>
      </div>
    )
  }

  const previewOrphans = report.orphans.slice(0, ORPHAN_PREVIEW_LIMIT)
  const hiddenCount = report.orphans.length - previewOrphans.length

  const maybeRenderOrphanList = () => {
    if (previewOrphans.length === 0) {
      return <p className="text-sm text-muted-foreground">太好了，目前沒有任何未引用的檔案。</p>
    }

    return (
      <ul className="divide-y rounded-lg border text-sm">
        {previewOrphans.map((object) => (
          <li key={object.path} className="flex items-center justify-between gap-4 px-3 py-2">
            <span className="truncate font-mono text-xs">{object.path}</span>
            <span className="shrink-0 text-muted-foreground tabular-nums">
              {formatBytes(object.size)}
            </span>
          </li>
        ))}
      </ul>
    )
  }

  const maybeRenderHiddenCount = () => {
    if (hiddenCount <= 0) return null
    return <p className="text-xs text-muted-foreground">另有 {hiddenCount} 個檔案未列出</p>
  }

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="儲存空間統計">
        <StatCard
          label="檔案總數"
          value={report.totalFiles}
          hint={formatBytes(report.totalBytes)}
        />
        <StatCard label="使用中" value={report.referencedFiles} />
        <StatCard
          label="未引用檔案"
          value={report.orphans.length}
          hint={`可釋放 ${formatBytes(report.orphanBytes)}`}
        />
        <StatCard
          label="寬限期保留"
          value={report.recentUnreferencedFiles}
          hint={`${ORPHAN_GRACE_PERIOD_HOURS} 小時內上傳`}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>未引用檔案清單</CardTitle>
          <CardDescription>掃描時間：{formatDateTime(report.scannedAt)}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-2">
            {maybeRenderOrphanList()}
            {maybeRenderHiddenCount()}
          </div>
          <CleanupForm orphanCount={report.orphans.length} />
        </CardContent>
      </Card>
    </>
  )
}

export default function AdminStoragePage() {
  const renderReportSkeleton = () => (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: STAT_SKELETON_COUNT }, (_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </>
  )

  return (
    <>
      <AdminPageHeader
        title="空間清理"
        description={`比對儲存空間與文章、作品內容，找出未被引用的圖片。${ORPHAN_GRACE_PERIOD_HOURS} 小時內上傳的檔案會暫時保留。`}
      />
      <Suspense fallback={renderReportSkeleton()}>
        <StorageReport />
      </Suspense>
    </>
  )
}
