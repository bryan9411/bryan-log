import { WebVitalRatingBadge } from "@/components/admin/dashboard/web-vital-rating"
import {
  formatWebVital,
  rateWebVital,
  WEB_VITAL_DEFINITION,
  WEB_VITAL_RATING,
  WEB_VITAL_RATING_LABEL,
  type WebVitalMetric,
  type WebVitalRating,
} from "@/lib/constants/web-vitals"
import type { WebVitalSummary } from "@/lib/data/web-vitals"
import { cn } from "@/lib/utils"

const TILE_SIZE = {
  LARGE: "large",
  COMPACT: "compact",
} as const

type TileSize = (typeof TILE_SIZE)[keyof typeof TILE_SIZE]

type WebVitalTileProps = {
  metric: WebVitalMetric
  summary: WebVitalSummary | undefined
  size?: TileSize
}

const percentFormatter = new Intl.NumberFormat("zh-TW", {
  style: "percent",
  maximumFractionDigits: 0,
})

const countFormatter = new Intl.NumberFormat("zh-TW")

const DISTRIBUTION_COLOR: Record<WebVitalRating, string> = {
  [WEB_VITAL_RATING.GOOD]: "var(--status-good)",
  [WEB_VITAL_RATING.NEEDS_IMPROVEMENT]: "var(--status-warning)",
  [WEB_VITAL_RATING.POOR]: "var(--status-critical)",
}

// 單一指標：p75 數值與評級，下方為良好／需改善／不佳的樣本比例
export function WebVitalTile({ metric, summary, size = TILE_SIZE.LARGE }: WebVitalTileProps) {
  const definition = WEB_VITAL_DEFINITION[metric]
  const isCompact = size === TILE_SIZE.COMPACT

  const distribution = summary
    ? [
        { rating: WEB_VITAL_RATING.GOOD, count: summary.good },
        { rating: WEB_VITAL_RATING.NEEDS_IMPROVEMENT, count: summary.needsImprovement },
        { rating: WEB_VITAL_RATING.POOR, count: summary.poor },
      ]
    : []

  const renderSegment = ({ rating, count }: (typeof distribution)[number]) => {
    if (!summary || count === 0) return null

    return (
      <div
        key={rating}
        className="h-full min-w-1 first:rounded-l-[4px] last:rounded-r-[4px]"
        style={{ flexGrow: count, backgroundColor: DISTRIBUTION_COLOR[rating] }}
      />
    )
  }

  const renderDistributionLabel = ({ rating, count }: (typeof distribution)[number]) => {
    if (!summary) return null

    return (
      <span key={rating} className="tabular-nums">
        {WEB_VITAL_RATING_LABEL[rating]} {percentFormatter.format(count / summary.samples)}
      </span>
    )
  }

  const renderBody = () => {
    if (!summary) {
      return <p className="text-sm text-muted-foreground">此範圍內尚無資料</p>
    }

    const rating = rateWebVital(metric, summary.p75)
    const distributionText = distribution
      .map(
        ({ rating: item, count }) =>
          `${WEB_VITAL_RATING_LABEL[item]} ${percentFormatter.format(count / summary.samples)}`,
      )
      .join("、")

    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p
            className={cn(
              "font-semibold tracking-tight tabular-nums",
              isCompact ? "text-xl" : "text-3xl",
            )}
          >
            {formatWebVital(metric, summary.p75)}
          </p>
          <WebVitalRatingBadge rating={rating} />
        </div>
        <div
          role="img"
          aria-label={`樣本分布：${distributionText}`}
          className="flex h-2 w-full gap-0.5 overflow-hidden rounded-[4px]"
        >
          {distribution.map(renderSegment)}
        </div>
        <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex gap-3">{distribution.map(renderDistributionLabel)}</span>
          <span className="tabular-nums">{countFormatter.format(summary.samples)} 筆樣本</span>
        </div>
      </>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex flex-col gap-0.5">
        <p className="flex items-baseline gap-2">
          <span className="font-mono text-sm font-semibold">{metric}</span>
          <span className="text-sm text-muted-foreground">{definition.label}</span>
        </p>
        {!isCompact && <p className="text-xs text-muted-foreground">{definition.description}</p>}
      </div>
      {renderBody()}
    </div>
  )
}
