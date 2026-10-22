"use client"

import { useEffect } from "react"
import { useReportWebVitals } from "next/web-vitals"

import { API_ROUTES } from "@/config/routes"
import { isTrackedPath } from "@/lib/analytics/tracked-paths"
import {
  MOBILE_MAX_WIDTH,
  WEB_VITAL_DEVICE,
  WEB_VITALS_BATCH_LIMIT,
  webVitalMetricSchema,
} from "@/lib/constants/web-vitals"
import type { WebVitalEntry } from "@/lib/validations/web-vitals"

const VISIBILITY_HIDDEN = "hidden"

let queue: WebVitalEntry[] = []

// 指標屬於「完整載入的那份文件」：CLS、INP 要到離開頁面才結算，此時網址可能已因客戶端導覽改變；
// 也可能是從後台載入後才導覽到前台。因此以 Navigation Timing 記錄的文件網址歸屬，而非目前網址
function getLandingPath() {
  const [navigation] = performance.getEntriesByType("navigation")
  return navigation ? new URL(navigation.name).pathname : window.location.pathname
}

const detectDevice = () =>
  window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches
    ? WEB_VITAL_DEVICE.MOBILE
    : WEB_VITAL_DEVICE.DESKTOP

// 頁面隱藏或關閉時一次送出；sendBeacon 不受頁面卸載影響，也不會阻塞使用者操作
function flush() {
  if (queue.length === 0) return

  const body = JSON.stringify({ entries: queue.slice(0, WEB_VITALS_BATCH_LIMIT) })
  queue = []

  const blob = new Blob([body], { type: "application/json" })
  if (navigator.sendBeacon?.(API_ROUTES.WEB_VITALS, blob)) return

  fetch(API_ROUTES.WEB_VITALS, { method: "POST", body, keepalive: true }).catch(() => {
    // 效能數據遺失不影響閱讀，不需提示
  })
}

type ReportedMetric = Parameters<Parameters<typeof useReportWebVitals>[0]>[0]

// 定義在元件外，回呼參照保持不變，useReportWebVitals 不會因重新渲染而重複註冊
function reportMetric(metric: ReportedMetric) {
  if (process.env.NODE_ENV !== "production") return

  const parsedMetric = webVitalMetricSchema.safeParse(metric.name)
  if (!parsedMetric.success) return

  const path = getLandingPath()
  if (!isTrackedPath(path)) return

  queue.push({
    metric: parsedMetric.data,
    value: metric.value,
    path,
    device: detectDevice(),
  })
}

// 自行收集真實訪客的 Web Vitals 供後台儀表板分析（與 Vercel Speed Insights 並行）；
// 只在正式環境回報，開發模式的數值未經最佳化，會污染統計
export function WebVitalsReporter() {
  useReportWebVitals(reportMetric)

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === VISIBILITY_HIDDEN) flush()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("pagehide", flush)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("pagehide", flush)
    }
  }, [])

  return null
}
