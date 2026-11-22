import "server-only"

import type { RadarModuleKey } from "@/config/radar"
import { chunk } from "@/lib/radar/http"
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

// 所有模組刪除項目都經過這個函式：第三期會在這裡加上「已收藏的項目不刪除」的條件
export async function removeRadarItems(client: ServiceClient, ids: string[]) {
  let removed = 0

  for (const batch of chunk(ids, DELETE_BATCH_SIZE)) {
    const { error, count } = await client
      .from("radar_items")
      .delete({ count: "exact" })
      .in("id", batch)

    if (error) throw new Error(`刪除雷達項目失敗：${error.message}`)
    removed += count ?? 0
  }

  return removed
}
