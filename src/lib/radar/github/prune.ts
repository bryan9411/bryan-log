import "server-only"

import { GITHUB_POOL, RADAR_WINDOW_DAYS } from "@/config/radar"
import { daysAgoIso, taipeiDate } from "@/lib/radar/dates"
import { chunk } from "@/lib/radar/http"
import { removeRadarItems } from "@/lib/radar/items"
import type { ServiceClient } from "@/lib/supabase/service"

const SNAPSHOT_QUERY_BATCH = 200

export type PoolItem = {
  id: string
  isBlocked: boolean
  lastSearchHitAt: string | null
}

async function loadWindowDeltas(client: ServiceClient, ids: string[], since: string) {
  const range = new Map<
    string,
    { first: string; firstValue: number; last: string; lastValue: number }
  >()

  for (const batch of chunk(ids, SNAPSHOT_QUERY_BATCH)) {
    const { data, error } = await client
      .from("radar_metric_snapshots")
      .select("item_id, snapshot_date, value")
      .in("item_id", batch)
      .gte("snapshot_date", since)

    if (error) throw new Error(`讀取快照失敗：${error.message}`)

    data.forEach(({ item_id, snapshot_date, value }) => {
      const current = range.get(item_id)
      if (!current) {
        range.set(item_id, {
          first: snapshot_date,
          firstValue: value,
          last: snapshot_date,
          lastValue: value,
        })
        return
      }
      if (snapshot_date < current.first)
        Object.assign(current, { first: snapshot_date, firstValue: value })
      if (snapshot_date > current.last)
        Object.assign(current, { last: snapshot_date, lastValue: value })
    })
  }

  return new Map([...range].map(([id, { firstValue, lastValue }]) => [id, lastValue - firstValue]))
}

// 移出候選池：連續 30 天沒被搜尋命中、且 7 日增量低於門檻；GitHub 上已不存在的 repo 一併移除
// 被管理員隱藏的 repo 保留在池中，否則下次被搜尋到時會以未隱藏的狀態重新加入
export async function pruneGithubPool(
  client: ServiceClient,
  pool: PoolItem[],
  missingIds: string[],
  now: number,
) {
  const staleBefore = daysAgoIso(now, GITHUB_POOL.PRUNE_AFTER_DAYS)
  const staleIds = pool
    .filter((item) => !item.isBlocked && (item.lastSearchHitAt ?? "") < staleBefore)
    .map((item) => item.id)

  const deltas = staleIds.length
    ? await loadWindowDeltas(client, staleIds, taipeiDate(now, -RADAR_WINDOW_DAYS))
    : new Map<string, number>()
  const lowGrowthIds = staleIds.filter((id) => (deltas.get(id) ?? 0) < GITHUB_POOL.PRUNE_MAX_DELTA)

  const removed = await removeRadarItems(client, [...new Set([...lowGrowthIds, ...missingIds])])

  const { error } = await client
    .from("radar_metric_snapshots")
    .delete()
    .lt("snapshot_date", taipeiDate(now, -GITHUB_POOL.SNAPSHOT_RETENTION_DAYS))
  if (error) throw new Error(`清理過期快照失敗：${error.message}`)

  return removed
}
