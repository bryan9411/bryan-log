import { createHash, timingSafeEqual } from "node:crypto"

import { revalidateTag } from "next/cache"

import { CACHE_TAG } from "@/lib/cache-tags"
import { getServerEnv } from "@/lib/env"
import { revalidateRadarPaths } from "@/lib/radar/revalidate"
import { runRadarSync } from "@/lib/radar/sync"

// Vercel 免費方案函式最長 300 秒；GitHub 候選池約 1,000 個 repo，實際約需 30～90 秒
export const maxDuration = 300

const BEARER_PREFIX = "Bearer "

// 先雜湊成固定長度再比較，避免以回應時間推測密鑰內容或長度
function safeEqual(a: string, b: string) {
  const hash = (value: string) => createHash("sha256").update(value).digest()
  return timingSafeEqual(hash(a), hash(b))
}

function isAuthorized(request: Request) {
  const header = request.headers.get("authorization")
  if (!header?.startsWith(BEARER_PREFIX)) return false

  try {
    return safeEqual(header.slice(BEARER_PREFIX.length), getServerEnv().CRON_SECRET)
  } catch (error) {
    // 環境變數缺漏時一律拒絕，錯誤細節只寫進伺服器紀錄
    console.error("[radar] 無法驗證排程請求：", error)
    return false
  }
}

// Vercel Cron 每天 UTC 18:00（台灣 02:00）以 GET 呼叫，並自動帶上 Authorization: Bearer <CRON_SECRET>
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const startedAt = Date.now()
  const reports = await runRadarSync()

  // Route Handler 不能使用 updateTag；以 stale-while-revalidate 方式失效，下一位訪客觸發重新查詢
  revalidateTag(CACHE_TAG.RADAR, "max")
  revalidateRadarPaths()

  const ok = reports.every((report) => report.ok)
  return Response.json(
    { ok, durationMs: Date.now() - startedAt, modules: reports },
    { status: ok ? 200 : 500 },
  )
}
