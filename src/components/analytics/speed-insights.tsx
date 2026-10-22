"use client"

import { SpeedInsights as VercelSpeedInsights } from "@vercel/speed-insights/next"

import { isTrackedPath } from "@/lib/analytics/tracked-paths"

type BeforeSend = NonNullable<Parameters<typeof VercelSpeedInsights>[0]["beforeSend"]>

const beforeSend: BeforeSend = (event) =>
  isTrackedPath(new URL(event.url).pathname) ? event : null

// 部署在 Vercel 並於專案中啟用 Speed Insights 後才會實際回報；本機開發只會在主控台輸出除錯訊息
export function SpeedInsights() {
  return <VercelSpeedInsights beforeSend={beforeSend} />
}
