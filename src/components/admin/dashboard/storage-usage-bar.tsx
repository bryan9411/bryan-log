import { formatBytes } from "@/lib/format"
import type { OrphanScanReport } from "@/lib/storage/orphan-cleaner"

type UsageSegment = {
  key: string
  label: string
  files: number
  bytes: number
  color: string
}

type StorageUsageBarProps = {
  report: OrphanScanReport
}

const percentFormatter = new Intl.NumberFormat("zh-TW", {
  style: "percent",
  maximumFractionDigits: 1,
})

// 以容量為單位的堆疊進度條；圖例逐項列出檔案數、容量與百分比，顏色不是唯一的辨識方式
export function StorageUsageBar({ report }: StorageUsageBarProps) {
  const segments: UsageSegment[] = [
    {
      key: "referenced",
      label: "使用中",
      files: report.referencedFiles,
      bytes: report.referencedBytes,
      color: "var(--chart-1)",
    },
    {
      key: "recent",
      label: "寬限期保留",
      files: report.recentUnreferencedFiles,
      bytes: report.recentUnreferencedBytes,
      color: "var(--chart-muted)",
    },
    {
      key: "orphan",
      label: "孤兒檔案",
      files: report.orphans.length,
      bytes: report.orphanBytes,
      color: "var(--chart-2)",
    },
  ]

  const ratioOf = (bytes: number) => (report.totalBytes > 0 ? bytes / report.totalBytes : 0)
  const orphanRatio = ratioOf(report.orphanBytes)

  const renderSegment = (segment: UsageSegment) => {
    const ratio = ratioOf(segment.bytes)
    if (ratio === 0) return null

    return (
      <div
        key={segment.key}
        className="h-full min-w-1 first:rounded-l-[4px] last:rounded-r-[4px]"
        style={{ flexGrow: ratio, backgroundColor: segment.color }}
        title={`${segment.label}：${formatBytes(segment.bytes)}（${percentFormatter.format(ratio)}）`}
      />
    )
  }

  const renderLegendItem = (segment: UsageSegment) => (
    <li key={segment.key} className="flex items-center gap-2.5 text-sm">
      <span
        className="size-2.5 shrink-0 rounded-[3px]"
        style={{ backgroundColor: segment.color }}
        aria-hidden
      />
      <span className="flex-1">{segment.label}</span>
      <span className="text-muted-foreground tabular-nums">{segment.files} 個檔案</span>
      <span className="w-20 text-right tabular-nums">{formatBytes(segment.bytes)}</span>
      <span className="w-14 text-right text-muted-foreground tabular-nums">
        {percentFormatter.format(ratioOf(segment.bytes))}
      </span>
    </li>
  )

  const maybeRenderBar = () => {
    if (report.totalBytes === 0) {
      return <p className="text-sm text-muted-foreground">儲存空間目前沒有任何檔案。</p>
    }

    return (
      <div
        role="img"
        aria-label={`孤兒檔案佔總容量 ${percentFormatter.format(orphanRatio)}`}
        className="flex h-3 w-full gap-0.5 overflow-hidden rounded-[4px]"
      >
        {segments.map(renderSegment)}
      </div>
    )
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-3xl font-semibold">{percentFormatter.format(orphanRatio)}</p>
        <p className="text-sm text-muted-foreground">
          孤兒檔案佔總容量 {formatBytes(report.totalBytes)}，共 {report.totalFiles} 個檔案
        </p>
      </div>
      {maybeRenderBar()}
      <ul className="grid gap-2.5" aria-label="儲存空間組成">
        {segments.map(renderLegendItem)}
      </ul>
    </div>
  )
}
