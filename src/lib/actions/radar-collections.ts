"use server"

import { revalidatePath } from "next/cache"

import {
  isRadarModuleKey,
  RADAR_COLLECTION_STATUS_LABEL,
  RADAR_MODULE_META,
  type RadarModuleKey,
} from "@/config/radar"
import { adminRadarCollectionRoute, ROUTES } from "@/config/routes"
import { createErrorState, createSuccessState, type ActionState } from "@/lib/actions/action-state"
import { requireAdmin } from "@/lib/auth/session"
import { renderCollectionNote } from "@/lib/radar/collections/note"
import { refreshCollection } from "@/lib/radar/collections/refresh"
import { buildCollectionSnapshot } from "@/lib/radar/collections/snapshot"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import {
  RADAR_COLLECTION_NOTE_MAX_LENGTH,
  radarCollectionIdSchema,
  radarCollectionUpdateSchema,
  radarCollectItemIdSchema,
  type RadarCollectionUpdate,
} from "@/lib/validations/radar-collection"

// 手動更新單筆最新數據的時間上限（GitHub、KEV 目錄、Advisory 單筆查詢都在數秒內完成）
const MANUAL_REFRESH_BUDGET_MS = 45_000

// 收藏只影響後台：前台 RPC 不讀收藏表，因此不需要失效前台的雷達快取
function revalidateCollections(moduleKey: RadarModuleKey | null, id?: string) {
  if (moduleKey) revalidatePath(RADAR_MODULE_META[moduleKey].adminPath)
  revalidatePath(ROUTES.ADMIN_RADAR_COLLECTIONS)
  revalidatePath(ROUTES.ADMIN_DASHBOARD)
  if (id) revalidatePath(adminRadarCollectionRoute(id))
}

// 收藏榜單項目：寫入收藏當下的快照（完整 data + 伺服器端重新計算的名次等排名情境）
// 以 module_key + external_id 防止重複收藏；已收藏時直接回報成功，不建立第二筆
export async function collectRadarItemAction(itemId: string): Promise<ActionState> {
  await requireAdmin()

  const parsed = radarCollectItemIdSchema.safeParse(itemId)
  if (!parsed.success) return createErrorState(parsed.error.issues[0].message)

  const supabase = await createClient()
  const { data: item, error: itemError } = await supabase
    .from("radar_items")
    .select("id, module_key, external_id, title, url, summary, categories, data, last_seen_at")
    .eq("id", parsed.data)
    .maybeSingle()

  if (itemError) return createErrorState("讀取項目失敗，請稍後再試")
  if (!item) return createErrorState("找不到這個項目，可能已被移出候選池")
  if (!isRadarModuleKey(item.module_key)) return createErrorState("未知的雷達模組")
  const moduleKey = item.module_key

  const { data: existing, error: existingError } = await supabase
    .from("radar_collections")
    .select("id, item_id")
    .eq("module_key", moduleKey)
    .eq("external_id", item.external_id)
    .maybeSingle()

  if (existingError) return createErrorState("讀取收藏失敗，請確認資料庫已執行收藏遷移")

  if (existing) {
    // 項目曾被刪除後又重新出現（id 不同）：把收藏重新指向目前的項目，快照維持原本的收藏當下
    if (existing.item_id !== item.id) {
      const { error } = await supabase
        .from("radar_collections")
        .update({ item_id: item.id })
        .eq("id", existing.id)
      if (error) return createErrorState("更新收藏失敗，請稍後再試")
    }
    revalidateCollections(moduleKey)
    return createSuccessState(`「${item.title}」已在收藏中`)
  }

  let snapshot
  try {
    snapshot = await buildCollectionSnapshot(
      supabase,
      { ...item, module_key: moduleKey },
      Date.now(),
    )
  } catch (error) {
    console.error("[radar] 建立收藏快照失敗：", error)
    return createErrorState("建立收藏快照失敗，請稍後再試")
  }

  const { error } = await supabase.from("radar_collections").insert({
    item_id: item.id,
    module_key: moduleKey,
    external_id: item.external_id,
    title: item.title,
    url: item.url,
    snapshot_at_save: snapshot,
    // 收藏當下的數據也是目前的最新數據（取得時間為該項目最後一次同步），之後由每日同步更新
    latest_data: item.data,
    latest_refreshed_at: item.last_seen_at,
  })

  // 23505：同時送出兩次收藏（unique 衝突），另一次已建立成功
  if (error && error.code !== "23505") {
    return createErrorState("收藏失敗，請確認資料庫已執行收藏遷移")
  }

  revalidateCollections(moduleKey)
  return createSuccessState(`已收藏「${item.title}」`)
}

// 更新研究欄位：列表只切換狀態，詳細頁一次儲存狀態、筆記與標籤
export async function updateRadarCollectionAction(
  id: string,
  update: RadarCollectionUpdate,
): Promise<ActionState> {
  await requireAdmin()

  const parsedId = radarCollectionIdSchema.safeParse(id)
  if (!parsedId.success) return createErrorState(parsedId.error.issues[0].message)

  const parsed = radarCollectionUpdateSchema.safeParse(update)
  if (!parsed.success) return createErrorState(parsed.error.issues[0].message)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("radar_collections")
    .update(parsed.data)
    .eq("id", parsedId.data)
    .select("title, module_key")
    .maybeSingle()

  if (error) return createErrorState("儲存失敗，請稍後再試")
  if (!data) return createErrorState("找不到這筆收藏，可能已被刪除")

  // 列表與詳細頁都只依賴收藏表，不必失效榜單頁
  revalidateCollections(null, parsedId.data)

  const { status, note, tags } = parsed.data
  if (status !== undefined && note === undefined && tags === undefined) {
    return createSuccessState(`「${data.title}」已改為「${RADAR_COLLECTION_STATUS_LABEL[status]}」`)
  }
  return createSuccessState("已儲存")
}

// 手動更新單筆最新數據：不論狀態一律向來源查詢；service role 只用於寫回，呼叫前已驗證管理員
export async function refreshRadarCollectionAction(id: string): Promise<ActionState> {
  await requireAdmin()

  const parsed = radarCollectionIdSchema.safeParse(id)
  if (!parsed.success) return createErrorState(parsed.error.issues[0].message)

  let outcome
  try {
    outcome = await refreshCollection(createServiceClient(), parsed.data, {
      deadline: Date.now() + MANUAL_REFRESH_BUDGET_MS,
    })
  } catch (error) {
    // 通常是缺少 SUPABASE_SERVICE_ROLE_KEY 或 GITHUB_TOKEN
    console.error("[radar] 手動更新收藏失敗：", error)
    return createErrorState(error instanceof Error ? error.message : "更新失敗，請稍後再試")
  }

  revalidateCollections(null, parsed.data)

  switch (outcome) {
    case "updated":
      return createSuccessState("已更新最新數據")
    case "unavailable":
      return createErrorState("來源已刪除或撤回，保留最後一次取得的數據")
    case "not_found":
      return createErrorState("找不到這筆收藏，可能已被刪除")
    case "failed":
      return createErrorState("向來源查詢失敗，請稍後再試")
  }
}

// 刪除收藏：筆記與標籤一併刪除；項目若仍在候選池，榜單上會回到「收藏」按鈕
export async function deleteRadarCollectionAction(id: string): Promise<ActionState> {
  await requireAdmin()

  const parsed = radarCollectionIdSchema.safeParse(id)
  if (!parsed.success) return createErrorState(parsed.error.issues[0].message)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("radar_collections")
    .delete()
    .eq("id", parsed.data)
    .select("title, module_key")
    .maybeSingle()

  if (error) return createErrorState("刪除失敗，請稍後再試")
  if (!data) return createErrorState("找不到這筆收藏，可能已被刪除")

  revalidateCollections(isRadarModuleKey(data.module_key) ? data.module_key : null, parsed.data)
  return createSuccessState(`已刪除收藏「${data.title}」`)
}

export type NotePreviewState =
  { status: "success"; html: string } | { status: "error"; message: string }

// 筆記預覽：與詳細頁初次載入相同的 Markdown 轉換與清理，只回傳 HTML，不寫入任何資料
export async function previewRadarCollectionNoteAction(
  markdown: string,
): Promise<NotePreviewState> {
  await requireAdmin()

  if (typeof markdown !== "string" || markdown.length > RADAR_COLLECTION_NOTE_MAX_LENGTH) {
    return { status: "error", message: "筆記超過長度上限，無法預覽" }
  }
  return { status: "success", html: renderCollectionNote(markdown) }
}
