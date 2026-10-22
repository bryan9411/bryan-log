import "server-only"

import {
  WEB_VITALS_DEVICE_FILTER,
  WEB_VITALS_RANGE_DAYS,
  webVitalMetricSchema,
  type WebVitalMetric,
  type WebVitalsFilter,
} from "@/lib/constants/web-vitals"
import { createClient } from "@/lib/supabase/server"

const PAGE_LIMIT = 10
const DAY_MS = 24 * 60 * 60 * 1000

export type WebVitalSummary = {
  p75: number
  samples: number
  good: number
  needsImprovement: number
  poor: number
}

export type WebVitalsDailyPoint = {
  // YYYY-MM-DD（台北時間）
  day: string
} & Partial<Record<WebVitalMetric, number>>

export type WebVitalsPage = {
  path: string
  pageLoads: number
  lcp: number | null
  inp: number | null
  cls: number | null
}

export type WebVitalsReport = {
  summary: Partial<Record<WebVitalMetric, WebVitalSummary>>
  daily: WebVitalsDailyPoint[]
  pages: WebVitalsPage[]
}

const dayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" })

// 補齊範圍內的每一天：沒有資料的日子在趨勢圖上呈現為斷點，而不是被直接連線帶過
function listDays(now: number, days: number) {
  return Array.from({ length: days }, (_, index) =>
    dayFormatter.format(new Date(now - (days - 1 - index) * DAY_MS)),
  )
}

// 三個彙總查詢並行；百分位數與分組都在資料庫端完成，只傳回少量結果列
export async function getWebVitalsReport({
  range,
  device,
}: WebVitalsFilter): Promise<WebVitalsReport> {
  const supabase = await createClient()
  const now = Date.now()
  const days = WEB_VITALS_RANGE_DAYS[range]
  const args = {
    since: new Date(now - days * DAY_MS).toISOString(),
    device_filter: device === WEB_VITALS_DEVICE_FILTER.ALL ? null : device,
  }

  const [summaryResult, dailyResult, pagesResult] = await Promise.all([
    supabase.rpc("get_web_vitals_summary", args),
    supabase.rpc("get_web_vitals_daily", args),
    supabase.rpc("get_web_vitals_pages", { ...args, page_limit: PAGE_LIMIT }),
  ])

  const error = summaryResult.error ?? dailyResult.error ?? pagesResult.error
  if (error) throw new Error(`讀取效能監控資料失敗：${error.message}`)

  const summaryRows = summaryResult.data ?? []
  const dailyRows = dailyResult.data ?? []
  const pageRows = pagesResult.data ?? []

  const summary: WebVitalsReport["summary"] = {}
  summaryRows.forEach((row) => {
    const metric = webVitalMetricSchema.safeParse(row.metric)
    if (!metric.success) return

    summary[metric.data] = {
      p75: row.p75,
      samples: Number(row.samples),
      good: Number(row.good),
      needsImprovement: Number(row.needs_improvement),
      poor: Number(row.poor),
    }
  })

  const dailyByDay = new Map<string, WebVitalsDailyPoint>(
    listDays(now, days).map((day) => [day, { day }]),
  )
  dailyRows.forEach((row) => {
    const metric = webVitalMetricSchema.safeParse(row.metric)
    const point = dailyByDay.get(row.day)
    if (metric.success && point) point[metric.data] = row.p75
  })

  return {
    summary,
    daily: [...dailyByDay.values()],
    pages: pageRows.map((row) => ({
      path: row.path,
      pageLoads: Number(row.page_loads),
      lcp: row.lcp_p75,
      inp: row.inp_p75,
      cls: row.cls_p75,
    })),
  }
}
