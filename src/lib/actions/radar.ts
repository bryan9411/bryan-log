"use server"

import { updateTag } from "next/cache"

import {
  RADAR_KEYWORD_RULE_KIND,
  RADAR_KEYWORD_RULE_KIND_LABEL,
  RADAR_MODULE_META,
  RADAR_VISIBILITY,
  type RadarKeywordRuleKind,
  type RadarModuleKey,
  type RadarVisibility,
} from "@/config/radar"
import { createErrorState, createSuccessState, type ActionState } from "@/lib/actions/action-state"
import { requireAdmin } from "@/lib/auth/session"
import { CACHE_TAG } from "@/lib/cache-tags"
import { applyKeywordRules, countKeywordMatches } from "@/lib/radar/keyword-rules"
import { revalidateRadarPaths } from "@/lib/radar/revalidate"
import { runRadarSync } from "@/lib/radar/sync"
import { createClient } from "@/lib/supabase/server"
import {
  RADAR_SYNC_FIELD,
  radarItemBlockedSchema,
  radarKeywordPreviewSchema,
  radarKeywordRuleIdSchema,
  radarKeywordRuleSchema,
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

  // 被排除關鍵字隱藏的項目手動還原後，下次同步又會被隱藏；改為引導到刪除規則
  if (!parsed.data.blocked) {
    const { data: current } = await supabase
      .from("radar_items")
      .select("blocked_reason, blocked_rule_id")
      .eq("id", parsed.data.id)
      .maybeSingle()
    if (current?.blocked_rule_id) {
      return createErrorState(
        `這個項目是被「${current.blocked_reason ?? "排除關鍵字"}」自動隱藏，請刪除該規則來還原`,
      )
    }
  }

  const { data, error } = await supabase
    .from("radar_items")
    .update({
      is_blocked: parsed.data.blocked,
      blocked_at: parsed.data.blocked ? new Date().toISOString() : null,
      // 手動隱藏不記錄原因，也不受排除規則影響
      blocked_reason: null,
      blocked_rule_id: null,
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

// -----------------------------------------------------------------------------
// 關鍵字規則：exclude 命中自動隱藏、watch 只加徽章；新增與刪除後立即套用到現有項目
// -----------------------------------------------------------------------------

export type KeywordPreviewState =
  { status: "success"; keyword: string; count: number } | { status: "error"; message: string }

// 只計算命中筆數，不寫入任何資料；回傳正規化後的關鍵字，確認新增時以同一個值送出
export async function previewRadarKeywordRuleAction(
  moduleKey: RadarModuleKey,
  keyword: string,
): Promise<KeywordPreviewState> {
  await requireAdmin()

  const parsed = radarKeywordPreviewSchema.safeParse({ moduleKey, keyword })
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message }

  try {
    const supabase = await createClient()
    const count = await countKeywordMatches(supabase, parsed.data.moduleKey, parsed.data.keyword)
    return { status: "success", keyword: parsed.data.keyword, count }
  } catch (error) {
    console.error("[radar] 預覽關鍵字規則失敗：", error)
    return { status: "error", message: "預覽失敗，請確認資料庫已執行資安遷移" }
  }
}

export async function addRadarKeywordRuleAction(
  moduleKey: RadarModuleKey,
  kind: RadarKeywordRuleKind,
  keyword: string,
): Promise<ActionState> {
  await requireAdmin()

  const parsed = radarKeywordRuleSchema.safeParse({ moduleKey, kind, keyword })
  if (!parsed.success) return createErrorState(parsed.error.issues[0].message)

  const supabase = await createClient()
  const { error } = await supabase.from("radar_keyword_rules").insert({
    module_key: parsed.data.moduleKey,
    kind: parsed.data.kind,
    keyword: parsed.data.keyword,
  })

  const label = RADAR_KEYWORD_RULE_KIND_LABEL[parsed.data.kind]
  if (error) {
    // 23505：unique (module_key, kind, keyword) 衝突
    if (error.code === "23505")
      return createErrorState(`「${parsed.data.keyword}」已經在${label}清單中`)
    return createErrorState("新增規則失敗，請確認資料庫已執行資安遷移")
  }

  let result
  try {
    result = await applyKeywordRules(supabase, parsed.data.moduleKey)
  } catch (applyError) {
    console.error("[radar] 套用關鍵字規則失敗：", applyError)
    revalidateRadar()
    return createErrorState("規則已新增，但套用到現有項目時失敗；下次同步會自動補套用")
  }

  revalidateRadar()

  return createSuccessState(
    parsed.data.kind === RADAR_KEYWORD_RULE_KIND.EXCLUDE
      ? `已新增排除關鍵字「${parsed.data.keyword}」，隱藏了 ${result.blocked} 筆項目`
      : `已新增關注關鍵字「${parsed.data.keyword}」，目前有 ${result.watched} 筆項目標示關注`,
  )
}

// 刪除排除規則後，因該規則被隱藏的項目自動還原（仍命中其他排除規則的除外；手動隱藏的不受影響）
export async function removeRadarKeywordRuleAction(id: string): Promise<ActionState> {
  await requireAdmin()

  const parsed = radarKeywordRuleIdSchema.safeParse(id)
  if (!parsed.success) return createErrorState(parsed.error.issues[0].message)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("radar_keyword_rules")
    .delete()
    .eq("id", parsed.data)
    .select("module_key, kind, keyword")
    .maybeSingle()

  if (error) return createErrorState("刪除規則失敗，請稍後再試")
  if (!data) return createErrorState("找不到這條規則，可能已被刪除")

  const parsedKey = radarModuleKeySchema.safeParse(data.module_key)
  let restored = 0
  if (parsedKey.success) {
    try {
      restored = (await applyKeywordRules(supabase, parsedKey.data)).restored
    } catch (applyError) {
      console.error("[radar] 套用關鍵字規則失敗：", applyError)
      revalidateRadar()
      return createErrorState("規則已刪除，但還原項目時失敗；下次同步會自動還原")
    }
  }

  revalidateRadar()

  return createSuccessState(
    data.kind === RADAR_KEYWORD_RULE_KIND.EXCLUDE
      ? `已刪除排除關鍵字「${data.keyword}」，還原了 ${restored} 筆項目`
      : `已刪除關注關鍵字「${data.keyword}」`,
  )
}
