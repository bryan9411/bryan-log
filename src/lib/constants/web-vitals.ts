import { z } from "zod"

// 與資料表 web_vitals 的 check 限制一致
export const WEB_VITAL_METRIC = {
  LCP: "LCP",
  INP: "INP",
  CLS: "CLS",
  FCP: "FCP",
  TTFB: "TTFB",
} as const

export const webVitalMetricSchema = z.enum([
  WEB_VITAL_METRIC.LCP,
  WEB_VITAL_METRIC.INP,
  WEB_VITAL_METRIC.CLS,
  WEB_VITAL_METRIC.FCP,
  WEB_VITAL_METRIC.TTFB,
])

export type WebVitalMetric = z.infer<typeof webVitalMetricSchema>

// Google 以這三項的 p75 判定頁面是否「通過 Core Web Vitals 評估」，其餘為輔助診斷指標
export const CORE_WEB_VITALS: WebVitalMetric[] = [
  WEB_VITAL_METRIC.LCP,
  WEB_VITAL_METRIC.INP,
  WEB_VITAL_METRIC.CLS,
]

export const SUPPORTING_WEB_VITALS: WebVitalMetric[] = [WEB_VITAL_METRIC.FCP, WEB_VITAL_METRIC.TTFB]

export const WEB_VITAL_RATING = {
  GOOD: "good",
  NEEDS_IMPROVEMENT: "needs-improvement",
  POOR: "poor",
} as const

export const webVitalRatingSchema = z.enum([
  WEB_VITAL_RATING.GOOD,
  WEB_VITAL_RATING.NEEDS_IMPROVEMENT,
  WEB_VITAL_RATING.POOR,
])

export type WebVitalRating = z.infer<typeof webVitalRatingSchema>

export const WEB_VITAL_RATING_LABEL: Record<WebVitalRating, string> = {
  [WEB_VITAL_RATING.GOOD]: "良好",
  [WEB_VITAL_RATING.NEEDS_IMPROVEMENT]: "需改善",
  [WEB_VITAL_RATING.POOR]: "不佳",
}

export const WEB_VITAL_DEVICE = {
  MOBILE: "mobile",
  DESKTOP: "desktop",
} as const

export const webVitalDeviceSchema = z.enum([WEB_VITAL_DEVICE.MOBILE, WEB_VITAL_DEVICE.DESKTOP])

export type WebVitalDevice = z.infer<typeof webVitalDeviceSchema>

// 與網站的 md 斷點一致：小於此寬度視為手機
export const MOBILE_MAX_WIDTH = 767

export const WEB_VITAL_UNIT = {
  MILLISECONDS: "ms",
  SCORE: "score",
} as const

type WebVitalUnit = (typeof WEB_VITAL_UNIT)[keyof typeof WEB_VITAL_UNIT]

type WebVitalDefinition = {
  label: string
  description: string
  unit: WebVitalUnit
  // value <= good 為良好，value > poor 為不佳，介於兩者之間為需改善（web.dev 官方門檻）
  thresholds: { good: number; poor: number }
}

export const WEB_VITAL_DEFINITION: Record<WebVitalMetric, WebVitalDefinition> = {
  [WEB_VITAL_METRIC.LCP]: {
    label: "最大內容繪製",
    description: "主要內容出現在畫面上所需的時間",
    unit: WEB_VITAL_UNIT.MILLISECONDS,
    thresholds: { good: 2500, poor: 4000 },
  },
  [WEB_VITAL_METRIC.INP]: {
    label: "互動至下一次繪製",
    description: "點擊、輸入後畫面回應的延遲",
    unit: WEB_VITAL_UNIT.MILLISECONDS,
    thresholds: { good: 200, poor: 500 },
  },
  [WEB_VITAL_METRIC.CLS]: {
    label: "累計版面配置位移",
    description: "載入過程中版面意外跳動的程度",
    unit: WEB_VITAL_UNIT.SCORE,
    thresholds: { good: 0.1, poor: 0.25 },
  },
  [WEB_VITAL_METRIC.FCP]: {
    label: "首次內容繪製",
    description: "畫面開始出現任何內容的時間",
    unit: WEB_VITAL_UNIT.MILLISECONDS,
    thresholds: { good: 1800, poor: 3000 },
  },
  [WEB_VITAL_METRIC.TTFB]: {
    label: "首位元組時間",
    description: "伺服器回應第一個位元組的時間",
    unit: WEB_VITAL_UNIT.MILLISECONDS,
    thresholds: { good: 800, poor: 1800 },
  },
}

export function rateWebVital(metric: WebVitalMetric, value: number): WebVitalRating {
  const { good, poor } = WEB_VITAL_DEFINITION[metric].thresholds
  if (value <= good) return WEB_VITAL_RATING.GOOD
  if (value <= poor) return WEB_VITAL_RATING.NEEDS_IMPROVEMENT
  return WEB_VITAL_RATING.POOR
}

const secondsFormatter = new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 2 })
const millisecondsFormatter = new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 0 })
const scoreFormatter = new Intl.NumberFormat("zh-TW", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
})

// 時間類指標滿 1 秒改以秒顯示，與 PageSpeed Insights 的呈現方式一致
export function formatWebVital(metric: WebVitalMetric, value: number) {
  if (WEB_VITAL_DEFINITION[metric].unit === WEB_VITAL_UNIT.SCORE) {
    return scoreFormatter.format(value)
  }
  if (value >= 1000) return `${secondsFormatter.format(value / 1000)} 秒`
  return `${millisecondsFormatter.format(value)} 毫秒`
}

// 數值上限與資料表一致（10 分鐘），超出視為異常資料
export const WEB_VITAL_MAX_VALUE = 600_000
export const WEB_VITAL_PATH_MAX_LENGTH = 200
// 單次回報的指標上限：一次完整載入最多 5 項，保留重複回報（例如 bfcache 還原）的空間
export const WEB_VITALS_BATCH_LIMIT = 10

// 儀表板的時間範圍與裝置篩選，以網址查詢參數表示
export const WEB_VITALS_RANGE = {
  WEEK: "7d",
  MONTH: "28d",
  QUARTER: "90d",
} as const

export const webVitalsRangeSchema = z.enum([
  WEB_VITALS_RANGE.WEEK,
  WEB_VITALS_RANGE.MONTH,
  WEB_VITALS_RANGE.QUARTER,
])

export type WebVitalsRange = z.infer<typeof webVitalsRangeSchema>

export const WEB_VITALS_RANGE_DAYS: Record<WebVitalsRange, number> = {
  [WEB_VITALS_RANGE.WEEK]: 7,
  [WEB_VITALS_RANGE.MONTH]: 28,
  [WEB_VITALS_RANGE.QUARTER]: 90,
}

export const WEB_VITALS_RANGE_LABEL: Record<WebVitalsRange, string> = {
  [WEB_VITALS_RANGE.WEEK]: "近 7 天",
  [WEB_VITALS_RANGE.MONTH]: "近 28 天",
  [WEB_VITALS_RANGE.QUARTER]: "近 90 天",
}

export const WEB_VITALS_DEVICE_FILTER = {
  ALL: "all",
  ...WEB_VITAL_DEVICE,
} as const

export const webVitalsDeviceFilterSchema = z.enum([
  WEB_VITALS_DEVICE_FILTER.ALL,
  WEB_VITALS_DEVICE_FILTER.MOBILE,
  WEB_VITALS_DEVICE_FILTER.DESKTOP,
])

export type WebVitalsDeviceFilter = z.infer<typeof webVitalsDeviceFilterSchema>

export const WEB_VITALS_DEVICE_FILTER_LABEL: Record<WebVitalsDeviceFilter, string> = {
  [WEB_VITALS_DEVICE_FILTER.ALL]: "全部裝置",
  [WEB_VITALS_DEVICE_FILTER.MOBILE]: "手機",
  [WEB_VITALS_DEVICE_FILTER.DESKTOP]: "桌機",
}

export const WEB_VITALS_SEARCH_PARAM = {
  RANGE: "vitalsRange",
  DEVICE: "vitalsDevice",
} as const

// 查詢參數不合法時回到預設值（28 天為 Google 評估 Core Web Vitals 的觀察期間）
export const webVitalsFilterSchema = z.object({
  range: webVitalsRangeSchema.catch(WEB_VITALS_RANGE.MONTH),
  device: webVitalsDeviceFilterSchema.catch(WEB_VITALS_DEVICE_FILTER.ALL),
})

export type WebVitalsFilter = z.infer<typeof webVitalsFilterSchema>
