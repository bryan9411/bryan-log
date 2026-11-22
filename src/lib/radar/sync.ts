import "server-only"

import { RADAR_MODULE, RADAR_MODULE_KEYS, type RadarModuleKey } from "@/config/radar"
import { syncGithub } from "@/lib/radar/github"
import { syncHn } from "@/lib/radar/hn"
import type { RadarSyncResult } from "@/lib/radar/sync-result"
import { createServiceClient, type ServiceClient } from "@/lib/supabase/service"

type RadarSyncer = (client: ServiceClient, now: number) => Promise<RadarSyncResult>

// 模組 key → 同步函式；第二期新增資安模組時只要在這裡註冊
const RADAR_SYNCERS: Record<RadarModuleKey, RadarSyncer> = {
  [RADAR_MODULE.GITHUB]: syncGithub,
  [RADAR_MODULE.HN]: syncHn,
}

// 錯誤訊息存進資料庫並顯示在後台，過長時截斷
const MAX_ERROR_LENGTH = 1000

export type RadarModuleSyncReport =
  | { key: RadarModuleKey; ok: true; durationMs: number; result: RadarSyncResult }
  | { key: RadarModuleKey; ok: false; durationMs: number; error: string }

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

// 依序執行，任一模組失敗不影響其他模組；呼叫端負責驗證身分（CRON_SECRET 或 requireAdmin）
export async function runRadarSync(keys: readonly RadarModuleKey[] = RADAR_MODULE_KEYS) {
  const client = createServiceClient()
  const reports: RadarModuleSyncReport[] = []

  for (const key of keys) {
    reports.push(await syncModule(client, key))
  }

  return reports
}
