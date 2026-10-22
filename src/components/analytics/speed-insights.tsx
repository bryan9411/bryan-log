"use client"

import { SpeedInsights as VercelSpeedInsights } from "@vercel/speed-insights/next"

import { PREVIEW_ROOT, ROUTES } from "@/config/routes"

type BeforeSend = NonNullable<Parameters<typeof VercelSpeedInsights>[0]["beforeSend"]>

// 只統計真實訪客：後台與草稿預覽頁由作者本人瀏覽，數據會干擾前台的 LCP、INP、CLS 判讀
const EXCLUDED_PATH_PREFIXES = [ROUTES.ADMIN, PREVIEW_ROOT]

const isExcludedPath = (pathname: string) =>
  EXCLUDED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))

const beforeSend: BeforeSend = (event) =>
  isExcludedPath(new URL(event.url).pathname) ? null : event

// 部署在 Vercel 並於專案中啟用 Speed Insights 後才會實際回報；本機開發只會在主控台輸出除錯訊息
export function SpeedInsights() {
  return <VercelSpeedInsights beforeSend={beforeSend} />
}
