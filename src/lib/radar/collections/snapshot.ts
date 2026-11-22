import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { RADAR_MODULE, type RadarModuleKey } from "@/config/radar"
import {
  parseAdvisoryData,
  parseGithubRepoData,
  parseHnStoryData,
  parseKevData,
} from "@/lib/radar/types"
import type { Database, Json } from "@/types/database"

type RadarClient = SupabaseClient<Database>

// 排名函式的上限；收藏時以伺服器端重新計算的名次為準，不信任前端傳入的名次
const RANKING_LOOKUP_LIMIT = 100

// 收藏當下的排名情境：名次為 null 代表收藏時已不在榜單上（例如超過統計期間或排在 100 名之後）
export type CollectionRankingContext =
  | {
      list: "github"
      rank: number | null
      weekly_stars: number | null
      total_stars: number
      window_days: number | null
      period_start: string | null
      period_end: string | null
    }
  | {
      list: "hn"
      // 熱門討論與 Show HN 是兩個榜單，Show HN 貼文可能同時出現在兩邊
      rank: number | null
      show_hn_rank: number | null
      points: number
      num_comments: number
    }
  | {
      list: "kev"
      rank: number | null
      epss: number | null
      ransomware: boolean
    }
  | {
      list: "advisory"
      rank: number | null
      severity: string
      epss: number | null
      patched_version: string | null
    }

// snapshot_at_save 的內容：data 與 radar_items.data 同格式，第 2 階段可直接和 latest_data 對照
export type CollectionSnapshot = {
  version: 1
  captured_at: string
  summary: string | null
  categories: string[]
  data: Json
  ranking: CollectionRankingContext
}

export type CollectableItem = {
  id: string
  module_key: RadarModuleKey
  summary: string | null
  categories: string[]
  data: Json
}

function findRank(rows: Array<{ item_id: string }> | null, itemId: string) {
  const index = (rows ?? []).findIndex((row) => row.item_id === itemId)
  return index === -1 ? null : index + 1
}

// latest_date 為 YYYY-MM-DD（台灣日期），統計期間 = latest_date 往前 window_days 天
function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

async function githubContext(client: RadarClient, item: CollectableItem) {
  const { data: rows, error } = await client.rpc("radar_github_ranking", {
    p_limit: RANKING_LOOKUP_LIMIT,
  })
  if (error) throw new Error(`讀取 GitHub 週榜失敗：${error.message}`)

  const rank = findRank(rows, item.id)
  const row = rank === null ? null : rows[rank - 1]
  const latestDate = rows[0]?.latest_date ?? null
  const windowDays = rows[0]?.window_days ?? null

  return {
    list: "github",
    rank,
    weekly_stars: row?.score ?? null,
    total_stars: row?.total ?? parseGithubRepoData(item.data).stars,
    window_days: windowDays,
    period_start: latestDate && windowDays !== null ? shiftDate(latestDate, -windowDays) : null,
    period_end: latestDate,
  } satisfies CollectionRankingContext
}

async function hnContext(client: RadarClient, item: CollectableItem) {
  const [top, show] = await Promise.all([
    client.rpc("radar_hn_ranking", { p_show_hn: false, p_limit: RANKING_LOOKUP_LIMIT }),
    client.rpc("radar_hn_ranking", { p_show_hn: true, p_limit: RANKING_LOOKUP_LIMIT }),
  ])
  const error = top.error ?? show.error
  if (error) throw new Error(`讀取 HN 週榜失敗：${error.message}`)

  const data = parseHnStoryData(item.data)
  return {
    list: "hn",
    rank: findRank(top.data, item.id),
    show_hn_rank: findRank(show.data, item.id),
    points: data.points,
    num_comments: data.num_comments,
  } satisfies CollectionRankingContext
}

// 名次為整體榜單的名次，不受後台主題篩選影響
async function securityContext(client: RadarClient, item: CollectableItem) {
  const isKev = !isAdvisory(item.data)
  const { data: rows, error } = await client.rpc(
    isKev ? "radar_security_kev_ranking" : "radar_security_advisory_ranking",
    { p_limit: RANKING_LOOKUP_LIMIT },
  )
  if (error) throw new Error(`讀取資安榜單失敗：${error.message}`)

  const rank = findRank(rows, item.id)

  if (isKev) {
    const data = parseKevData(item.data)
    return {
      list: "kev",
      rank,
      epss: data.epss,
      ransomware: data.ransomware,
    } satisfies CollectionRankingContext
  }

  const data = parseAdvisoryData(item.data)
  return {
    list: "advisory",
    rank,
    severity: data.severity,
    epss: data.epss,
    patched_version: data.patched_version,
  } satisfies CollectionRankingContext
}

function isAdvisory(data: Json) {
  return (
    data !== null &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    (data as Record<string, Json | undefined>).source === "advisory"
  )
}

const CONTEXT_BUILDERS: Record<
  RadarModuleKey,
  (client: RadarClient, item: CollectableItem) => Promise<CollectionRankingContext>
> = {
  [RADAR_MODULE.GITHUB]: githubContext,
  [RADAR_MODULE.HN]: hnContext,
  [RADAR_MODULE.SECURITY]: securityContext,
}

// 收藏當下凍結：項目的完整 data，加上依目前榜單重新計算的名次等排名情境
export async function buildCollectionSnapshot(
  client: RadarClient,
  item: CollectableItem,
  now: number,
): Promise<CollectionSnapshot> {
  const ranking = await CONTEXT_BUILDERS[item.module_key](client, item)

  return {
    version: 1,
    captured_at: new Date(now).toISOString(),
    summary: item.summary,
    categories: item.categories,
    data: item.data,
    ranking,
  }
}
