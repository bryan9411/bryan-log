import "server-only"

import type { RadarModuleKey } from "@/config/radar"
import { chunk } from "@/lib/radar/http"
import { isMissingTableError } from "@/lib/supabase/errors"
import type { ServiceClient } from "@/lib/supabase/service"
import type { Database } from "@/types/database"

type RadarItemInsert = Database["public"]["Tables"]["radar_items"]["Insert"]

// Supabase 預設每次最多回傳 1,000 筆，候選池可能超過，需要分頁讀取
const PAGE_SIZE = 1000
// 寫入與刪除分批送出，避免單一請求的內容或網址過長
const WRITE_BATCH_SIZE = 500
const DELETE_BATCH_SIZE = 200

export type StoredRadarItem = {
  id: string
  external_id: string
  data: Database["public"]["Tables"]["radar_items"]["Row"]["data"]
  is_blocked: boolean
}

export async function loadModuleItems(
  client: ServiceClient,
  moduleKey: RadarModuleKey,
): Promise<StoredRadarItem[]> {
  const items: StoredRadarItem[] = []

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from("radar_items")
      .select("id, external_id, data, is_blocked")
      .eq("module_key", moduleKey)
      .order("id")
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw new Error(`讀取雷達項目失敗：${error.message}`)

    items.push(...data)
    if (data.length < PAGE_SIZE) return items
  }
}

// 以 (module_key, external_id) upsert：只更新有傳入的欄位，因此不會覆蓋管理員設定的隱藏狀態
export async function upsertRadarItems(
  client: ServiceClient,
  rows: RadarItemInsert[],
): Promise<Map<string, string>> {
  const idsByExternalId = new Map<string, string>()

  for (const batch of chunk(rows, WRITE_BATCH_SIZE)) {
    const { data, error } = await client
      .from("radar_items")
      .upsert(batch, { onConflict: "module_key,external_id" })
      .select("id, external_id")

    if (error) throw new Error(`寫入雷達項目失敗：${error.message}`)

    data.forEach(({ id, external_id }) => idsByExternalId.set(external_id, id))
  }

  return idsByExternalId
}

async function loadCollectedItemIds(client: ServiceClient, ids: string[]) {
  const { data, error } = await client
    .from("radar_collections")
    .select("item_id")
    .in("item_id", ids)

  if (error) {
    // 收藏遷移尚未執行時沒有任何收藏，照常清理，避免同步因此失敗
    if (isMissingTableError(error)) return new Set<string>()
    throw new Error(`讀取收藏失敗：${error.message}`)
  }
  return new Set(data.flatMap(({ item_id }) => (item_id ? [item_id] : [])))
}

// 所有模組刪除項目都經過這個函式：已收藏的項目一律保留，收藏才能持續每日更新最新數據
// 保留的項目仍受各排名函式的統計期間限制，過期後不會出現在榜單上
export async function removeRadarItems(client: ServiceClient, ids: string[]) {
  let removed = 0

  for (const candidates of chunk(ids, DELETE_BATCH_SIZE)) {
    const collected = await loadCollectedItemIds(client, candidates)
    const batch = candidates.filter((id) => !collected.has(id))
    if (batch.length === 0) continue

    const { error, count } = await client
      .from("radar_items")
      .delete({ count: "exact" })
      .in("id", batch)

    if (error) throw new Error(`刪除雷達項目失敗：${error.message}`)
    removed += count ?? 0
  }

  return removed
}
