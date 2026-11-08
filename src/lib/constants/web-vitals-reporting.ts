// 訪客瀏覽器回報 Web Vitals 所需的常數；此檔會進入前台所有頁面，刻意不引入 zod
// 與資料表 web_vitals 的 check 限制一致
export const WEB_VITAL_METRIC = {
  LCP: "LCP",
  INP: "INP",
  CLS: "CLS",
  FCP: "FCP",
  TTFB: "TTFB",
} as const

export type WebVitalMetric = (typeof WEB_VITAL_METRIC)[keyof typeof WEB_VITAL_METRIC]

export function isWebVitalMetric(value: unknown): value is WebVitalMetric {
  return Object.values<unknown>(WEB_VITAL_METRIC).includes(value)
}

export const WEB_VITAL_DEVICE = {
  MOBILE: "mobile",
  DESKTOP: "desktop",
} as const

// 與網站的 md 斷點一致：小於此寬度視為手機
export const MOBILE_MAX_WIDTH = 767

// 單次回報的指標上限：一次完整載入最多 5 項，保留重複回報（例如 bfcache 還原）的空間
export const WEB_VITALS_BATCH_LIMIT = 10
