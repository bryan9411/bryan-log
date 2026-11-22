import "server-only"

import {
  isRadarModuleKey,
  RADAR_COLLECTION_REFRESH,
  RADAR_MODULE,
  RADAR_MODULE_KEYS,
  type RadarModuleKey,
} from "@/config/radar"
import { refreshCollections, type CollectionRefreshResult } from "@/lib/radar/collections/refresh"
import { syncGithub } from "@/lib/radar/github"
import { syncHn } from "@/lib/radar/hn"
import { syncSecurity } from "@/lib/radar/security"
import type { RadarSyncResult } from "@/lib/radar/sync-result"
import { createServiceClient, type ServiceClient } from "@/lib/supabase/service"

type RadarSyncer = (client: ServiceClient, now: number) => Promise<RadarSyncResult>

// 模組 key → 同步函式；新增模組時只要在這裡註冊
const RADAR_SYNCERS: Record<RadarModuleKey, RadarSyncer> = {
  [RADAR_MODULE.GITHUB]: syncGithub,
  [RADAR_MODULE.HN]: syncHn,
  [RADAR_MODULE.SECURITY]: syncSecurity,
}

// 錯誤訊息存進資料庫並顯示在後台，過長時截斷
const MAX_ERROR_LENGTH = 1000

export type RadarModuleSyncReport =
  | { key: RadarModuleKey; ok: true; durationMs: number; result: RadarSyncResult }
  | { key: RadarModuleKey; ok: false; durationMs: number; error: string }

export type CollectionRefreshReport =
  | { ok: true; durationMs: number; result: CollectionRefreshResult }
  | { ok: false; durationMs: number; error: string }

export type RadarSyncRun = {
  modules: RadarModuleSyncReport[]
  collections: CollectionRefreshReport
}

function toErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return message.slice(0, MAX_ERROR_LENGTH)
}

async function syncModule(
  client: ServiceClient,
  key: RadarModuleKey,
): Promise<RadarModuleSyncReport> {
  const startedAt = Date.now()
  let report: RadarModuleSyncReport

  try {
    const result = await RADAR_SYNCERS[key](client, startedAt)
    report = { key, ok: true, durationMs: Date.now() - startedAt, result }
  } catch (error) {
    console.error(`[radar] ${key} 同步失敗：`, error)
    report = { key, ok: false, durationMs: Date.now() - startedAt, error: toErrorMessage(error) }
  }

  // 失敗時不更新 last_synced_at：前台沿用上一次成功的資料，並以「最後成功同步時間」顯示
  const { error } = await client
    .from("radar_modules")
    .update(
      report.ok
        ? {
            last_synced_at: new Date().toISOString(),
            last_sync_status: "success",
            last_sync_error: null,
          }
        : { last_sync_status: "failed", last_sync_error: report.error },
    )
    .eq("key", key)
  if (error) console.error(`[radar] 寫回 ${key} 同步狀態失敗：${error.message}`)

  return report
}

// 收藏的最新數據：失敗只記錄在回報中，不影響各模組的同步結果
async function refreshModuleCollections(
  client: ServiceClient,
  keys: readonly RadarModuleKey[],
  since: number,
): Promise<CollectionRefreshReport> {
  const startedAt = Date.now()

  try {
    const result = await refreshCollections(client, {
      moduleKeys: keys,
      since,
      deadline: since + RADAR_COLLECTION_REFRESH.API_BUDGET_MS,
    })
    return { ok: true, durationMs: Date.now() - startedAt, result }
  } catch (error) {
    console.error("[radar] 收藏更新失敗：", error)
    return { ok: false, durationMs: Date.now() - startedAt, error: toErrorMessage(error) }
  }
}

// 依序執行，任一模組失敗不影響其他模組；全部同步完後更新這些模組的收藏
// 呼叫端負責驗證身分（CRON_SECRET 或 requireAdmin）
// Vercel Cron 以 ?module= 拆成兩個排程（GitHub／HN 一個、資安一個），各自有完整的 300 秒
export async function runRadarSync(
  keys: readonly RadarModuleKey[] = RADAR_MODULE_KEYS,
): Promise<RadarSyncRun> {
  const startedAt = Date.now()
  const client = createServiceClient()
  const modules: RadarModuleSyncReport[] = []

  for (const key of keys) {
    modules.push(await syncModule(client, key))
  }

  const collections = await refreshModuleCollections(client, keys, startedAt)
  return { modules, collections }
}

// 解析 Cron 的 ?module=github,hn 參數；沒有帶參數時同步全部模組，含未知 key 時回傳 null
export function parseRadarModuleParam(value: string | null): RadarModuleKey[] | null {
  if (value === null || value.trim() === "") return [...RADAR_MODULE_KEYS]

  const keys = [
    ...new Set(
      value
        .split(",")
        .map((key) => key.trim())
        .filter(Boolean),
    ),
  ]
  if (keys.length === 0 || !keys.every(isRadarModuleKey)) return null
  return keys
}
