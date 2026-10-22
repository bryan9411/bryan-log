import { CircleCheckIcon, CircleXIcon, TriangleAlertIcon, type LucideIcon } from "lucide-react"

import {
  WEB_VITAL_RATING,
  WEB_VITAL_RATING_LABEL,
  type WebVitalRating,
} from "@/lib/constants/web-vitals"
import { cn } from "@/lib/utils"

export const RATING_STYLE: Record<WebVitalRating, { icon: LucideIcon; color: string }> = {
  [WEB_VITAL_RATING.GOOD]: { icon: CircleCheckIcon, color: "var(--status-good)" },
  [WEB_VITAL_RATING.NEEDS_IMPROVEMENT]: {
    icon: TriangleAlertIcon,
    color: "var(--status-warning)",
  },
  [WEB_VITAL_RATING.POOR]: { icon: CircleXIcon, color: "var(--status-critical)" },
}

type WebVitalRatingBadgeProps = {
  rating: WebVitalRating
  className?: string
}

// 狀態色只用在圖示，文字維持一般字色；評級一律以「圖示＋文字」呈現，不單靠顏色辨識
export function WebVitalRatingBadge({ rating, className }: WebVitalRatingBadgeProps) {
  const { icon: Icon, color } = RATING_STYLE[rating]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        className,
      )}
    >
      <Icon className="size-3.5" style={{ color }} aria-hidden />
      {WEB_VITAL_RATING_LABEL[rating]}
    </span>
  )
}

type WebVitalValueProps = {
  rating: WebVitalRating
  children: React.ReactNode
}

// 表格儲存格用的精簡版：圖示＋數值，評級文字提供給螢幕閱讀器與滑鼠提示
export function WebVitalValue({ rating, children }: WebVitalValueProps) {
  const { icon: Icon, color } = RATING_STYLE[rating]
  const label = WEB_VITAL_RATING_LABEL[rating]

  return (
    <span className="inline-flex items-center justify-end gap-1.5 tabular-nums" title={label}>
      <Icon className="size-3.5 shrink-0" style={{ color }} aria-hidden />
      {children}
      <span className="sr-only">（{label}）</span>
    </span>
  )
}
