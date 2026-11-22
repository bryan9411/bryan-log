"use server"

import { revalidatePath } from "next/cache"

import { isRadarModuleKey, RADAR_MODULE_META, type RadarModuleKey } from "@/config/radar"
import { createErrorState, createSuccessState, type ActionState } from "@/lib/actions/action-state"
import { requireAdmin } from "@/lib/auth/session"
import { buildCollectionSnapshot } from "@/lib/radar/collections/snapshot"
import { createClient } from "@/lib/supabase/server"
import { radarCollectItemIdSchema } from "@/lib/validations/radar-collection"

// 收藏只影響後台：前台 RPC 不讀收藏表，因此不需要失效前台的雷達快取
function revalidateCollections(moduleKey: RadarModuleKey) {
  revalidatePath(RADAR_MODULE_META[moduleKey].adminPath)
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
