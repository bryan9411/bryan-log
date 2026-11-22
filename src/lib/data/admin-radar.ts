import "server-only"

import {
  isRadarModuleKey,
  RADAR_CANDIDATE_LIMIT,
  RADAR_MODULE,
  RADAR_MODULE_META,
  type RadarModuleKey,
  type RadarVisibility,
} from "@/config/radar"
import { taipeiDate } from "@/lib/radar/dates"
import {
  toGithubRanking,
  toHnRankingItem,
  type GithubRanking,
  type HnRankingItem,
} from "@/lib/radar/ranking"
import { listKeywordRules, type RadarKeywordRule } from "@/lib/radar/keyword-rules"
import {
  toAdvisoryRankingItem,
  toKevRankingItem,
  type SecurityRanking,
} from "@/lib/radar/security/ranking"
import { createClient } from "@/lib/supabase/server"

export type AdminRadarModule = {
  key: RadarModuleKey
  name: string
  visibility: RadarVisibility
  lastSyncedAt: string | null
  lastSyncStatus: "success" | "failed" | null
  lastSyncError: string | null
  itemCount: number
  blockedCount: number
  // 只有使用快照的模組（GitHub）才有
  todaySnapshotCount: number | null
}

export type BlockedRadarItem = {
  id: string
  title: string
  url: string
  summary: string | null
  blockedAt: string | null
  // 被排除關鍵字自動隱藏時為「排除關鍵字：xxx」；手動隱藏為 null
  blockedReason: string | null
  blockedByRule: boolean
}

async function countItems(moduleKey: RadarModuleKey, blocked?: boolean) {
  const supabase = await createClient()
  let query = supabase
    .from("radar_items")
    .select("id", { count: "exact", head: true })
    .eq("module_key", moduleKey)
  if (blocked !== undefined) query = query.eq("is_blocked", blocked)

  const { count, error } = await query
  if (error) throw new Error(`統計雷達項目失敗：${error.message}`)
  return count ?? 0
}

async function countTodaySnapshots(moduleKey: RadarModuleKey, now: number) {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from("radar_metric_snapshots")
    .select("item_id, radar_items!inner(module_key)", { count: "exact", head: true })
    .eq("snapshot_date", taipeiDate(now))
    .eq("radar_items.module_key", moduleKey)

  if (error) throw new Error(`統計今日快照失敗：${error.message}`)
  return count ?? 0
}

// 後台需要即時的同步狀態與數量，因此不快取
export async function listAdminRadarModules(now: number): Promise<AdminRadarModule[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("radar_modules")
    .select("key, name, visibility, last_synced_at, last_sync_status, last_sync_error")
    .order("sort_order", { ascending: true })
    .order("key", { ascending: true })

  if (error) throw new Error(`讀取雷達模組失敗：${error.message}`)

  const modules = data.filter((row) => isRadarModuleKey(row.key))

  return Promise.all(
    modules.map(async (row) => {
      const key = row.key as RadarModuleKey
      const [itemCount, blockedCount, todaySnapshotCount] = await Promise.all([
        countItems(key),
        countItems(key, true),
        key === RADAR_MODULE.GITHUB ? countTodaySnapshots(key, now) : null,
      ])

      return {
        key,
        name: row.name || RADAR_MODULE_META[key].label,
        visibility: row.visibility,
        lastSyncedAt: row.last_synced_at,
        lastSyncStatus: row.last_sync_status,
        lastSyncError: row.last_sync_error,
        itemCount,
        blockedCount,
        todaySnapshotCount,
      }
    }),
  )
}

// 後台榜單不檢查模組是否公開，讓模組隱藏期間也能先檢視與整理
export async function getAdminGithubRanking(): Promise<GithubRanking> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("radar_github_ranking", {
    p_limit: RADAR_CANDIDATE_LIMIT,
  })

  if (error) throw new Error(`讀取 GitHub 週榜失敗：${error.message}`)
  return toGithubRanking(data)
}

export async function getAdminHnRanking(): Promise<{
  top: HnRankingItem[]
  show: HnRankingItem[]
}> {
  const supabase = await createClient()
  const [top, show] = await Promise.all([
    supabase.rpc("radar_hn_ranking", { p_show_hn: false, p_limit: RADAR_CANDIDATE_LIMIT }),
    supabase.rpc("radar_hn_ranking", { p_show_hn: true, p_limit: RADAR_CANDIDATE_LIMIT }),
  ])

  const error = top.error ?? show.error
  if (error) throw new Error(`讀取 HN 週榜失敗：${error.message}`)

  return {
    top: (top.data ?? []).map(toHnRankingItem),
    show: (show.data ?? []).map(toHnRankingItem),
  }
}

export async function listBlockedRadarItems(
  moduleKey: RadarModuleKey,
): Promise<BlockedRadarItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("radar_items")
    .select("id, title, url, summary, blocked_at, blocked_reason, blocked_rule_id")
    .eq("module_key", moduleKey)
    .eq("is_blocked", true)
    .order("blocked_at", { ascending: false, nullsFirst: false })

  if (error) throw new Error(`讀取已隱藏項目失敗：${error.message}`)

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    url: row.url,
    summary: row.summary,
    blockedAt: row.blocked_at,
    blockedReason: row.blocked_reason,
    blockedByRule: row.blocked_rule_id !== null,
  }))
}

// 後台多取候選（上限 100），主題篩選後仍能顯示到第 25 名
const ADMIN_SECURITY_CANDIDATE_LIMIT = 100

export async function getAdminSecurityRanking(): Promise<SecurityRanking> {
  const supabase = await createClient()
  const [kev, advisory] = await Promise.all([
    supabase.rpc("radar_security_kev_ranking", { p_limit: ADMIN_SECURITY_CANDIDATE_LIMIT }),
    supabase.rpc("radar_security_advisory_ranking", { p_limit: ADMIN_SECURITY_CANDIDATE_LIMIT }),
  ])

  const error = kev.error ?? advisory.error
  if (error) throw new Error(`讀取資安榜單失敗：${error.message}`)

  return {
    kev: (kev.data ?? []).map(toKevRankingItem),
    advisory: (advisory.data ?? []).map(toAdvisoryRankingItem),
  }
}

export async function listAdminKeywordRules(
  moduleKey: RadarModuleKey,
): Promise<RadarKeywordRule[]> {
  const supabase = await createClient()
  return listKeywordRules(supabase, moduleKey)
}
