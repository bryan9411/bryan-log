"use server"

import { updateTag } from "next/cache"

import {
  RADAR_MODULE_META,
  RADAR_VISIBILITY,
  type RadarModuleKey,
  type RadarVisibility,
} from "@/config/radar"
import { createErrorState, createSuccessState, type ActionState } from "@/lib/actions/action-state"
import { requireAdmin } from "@/lib/auth/session"
import { CACHE_TAG } from "@/lib/cache-tags"
import { revalidateRadarPaths } from "@/lib/radar/revalidate"
import { runRadarSync } from "@/lib/radar/sync"
import { createClient } from "@/lib/supabase/server"
import {
  RADAR_SYNC_FIELD,
  radarItemBlockedSchema,
  radarModuleKeySchema,
  radarModuleVisibilitySchema,
} from "@/lib/validations/radar"

// 榜單、導覽列與後台頁面都依賴雷達資料，異動後立即失效
function revalidateRadar() {
  updateTag(CACHE_TAG.RADAR)
  revalidateRadarPaths()
}

export async function setRadarModuleVisibilityAction(
  key: RadarModuleKey,
  visibility: RadarVisibility,
): Promise<ActionState> {
  await requireAdmin()

  const parsed = radarModuleVisibilitySchema.safeParse({ key, visibility })
  if (!parsed.success) return createErrorState(parsed.error.issues[0].message)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("radar_modules")
    .update({ visibility: parsed.data.visibility })
    .eq("key", parsed.data.key)
    .select("key")
    .maybeSingle()

  if (error) return createErrorState("更新公開狀態失敗，請稍後再試")
  if (!data) return createErrorState("找不到這個模組，請確認資料庫已執行雷達遷移")

  revalidateRadar()

  const { label } = RADAR_MODULE_META[parsed.data.key]
  return createSuccessState(
    parsed.data.visibility === RADAR_VISIBILITY.PUBLIC
      ? `「${label}」已公開，前台與導覽列會立即出現`
      : `「${label}」已改為僅自己可見，前台頁面會回應 404`,
  )
}

// 隱藏只影響前台與排名，項目仍保留在候選池中，還原後立即回到原本的名次
export async function setRadarItemBlockedAction(
  id: string,
  blocked: boolean,
): Promise<ActionState> {
  await requireAdmin()

  const parsed = radarItemBlockedSchema.safeParse({ id, blocked })
  if (!parsed.success) return createErrorState(parsed.error.issues[0].message)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("radar_items")
    .update({
      is_blocked: parsed.data.blocked,
      blocked_at: parsed.data.blocked ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.id)
    .select("title")
    .maybeSingle()

  if (error) return createErrorState("更新隱藏狀態失敗，請稍後再試")
  if (!data) return createErrorState("找不到這個項目，可能已被移出候選池")

  revalidateRadar()

  return createSuccessState(
    parsed.data.blocked ? `已隱藏「${data.title}」，後面的名次自動遞補` : `已還原「${data.title}」`,
  )
}

// 與 Vercel Cron 執行同一組同步函式；所在頁面設定了 maxDuration，GitHub 同步約需數十秒
export async function syncRadarModuleAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin()

  const parsed = radarModuleKeySchema.safeParse(formData.get(RADAR_SYNC_FIELD))
  if (!parsed.success) return createErrorState(parsed.error.issues[0].message)

  let reports
  try {
    reports = await runRadarSync([parsed.data])
  } catch (error) {
    // 通常是缺少 SUPABASE_SERVICE_ROLE_KEY 或 GITHUB_TOKEN
    console.error("[radar] 手動同步無法執行：", error)
    return createErrorState(error instanceof Error ? error.message : "同步失敗，請稍後再試")
  }

  revalidateRadar()

  const [report] = reports
  const { label } = RADAR_MODULE_META[parsed.data]
  const seconds = (report.durationMs / 1000).toFixed(1)

  if (!report.ok) return createErrorState(`「${label}」同步失敗：${report.error}`)

  return createSuccessState(
    `「${label}」同步完成：共 ${report.result.count} 筆，耗時 ${seconds} 秒`,
  )
}
