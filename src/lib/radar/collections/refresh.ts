import "server-only"

import {
  RADAR_COLLECTION_REFRESH,
  RADAR_COLLECTION_STATUS,
  RADAR_MODULE,
  type RadarModuleKey,
} from "@/config/radar"
import { getServerEnv } from "@/lib/env"
import { toGithubItemData } from "@/lib/radar/github"
import { refreshGithubRepos } from "@/lib/radar/github/refresh"
import { fetchHnStoriesById } from "@/lib/radar/hn"
import { chunk, mapWithConcurrency } from "@/lib/radar/http"
import { GHSA_PREFIX, KEV_PREFIX, toAdvisoryRow, toKevRow } from "@/lib/radar/security"
import { fetchAdvisory, normalizeAdvisory } from "@/lib/radar/security/advisory"
import { fetchEpssScores, fetchKevCatalog, type KevEntry } from "@/lib/radar/security/kev"
import { parseAdvisoryData, parseGithubRepoData, parseKevData } from "@/lib/radar/types"
import { isMissingTableError } from "@/lib/supabase/errors"
import type { ServiceClient } from "@/lib/supabase/service"
import type { Json } from "@/types/database"

const PAGE_SIZE = 1000
const ITEM_QUERY_BATCH = 200

type CollectionTarget = {
  id: string
  item_id: string | null
  module_key: string
  external_id: string
  latest_data: Json | null
  snapshot_at_save: Json
}

// data：取得最新數據；unavailable：來源已刪除（404、撤回），保留最後一次的 latest_data
type Outcome = { kind: "data"; data: Json } | { kind: "unavailable" }

export type CollectionRefreshResult = {
  // 本次需要更新的收藏數（不含封存）
  total: number
  // 項目仍在 radar_items 且今天已同步，直接複製 data
  copied: number
  // 項目已被清理或今天沒同步到，另外呼叫來源 API
  fetched: number
  unavailable: number
  failed: number
  // 超過時間預算而跳過，下次同步再補
  skipped: number
}

type RefreshOptions = {
  moduleKeys: readonly RadarModuleKey[]
  // 本次同步開始的時間：radar_items.last_seen_at 在這之後代表今天已同步過
  since: number
  // 超過這個時間就不再呼叫外部 API
  deadline: number
  now?: number
}

function asRecord(value: Json | null | undefined): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {}
}

// 上一次的數據：優先用 latest_data，還沒更新過時用收藏當下的快照
function previousData(target: CollectionTarget): Json {
  return target.latest_data ?? asRecord(target.snapshot_at_save).data ?? {}
}

async function loadTargets(client: ServiceClient, moduleKeys: readonly RadarModuleKey[]) {
  const targets: CollectionTarget[] = []

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from("radar_collections")
      .select("id, item_id, module_key, external_id, latest_data, snapshot_at_save")
      .in("module_key", [...moduleKeys])
      .neq("status", RADAR_COLLECTION_STATUS.ARCHIVED)
      .order("id")
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      // 收藏遷移尚未執行：沒有收藏需要更新
      if (isMissingTableError(error)) return targets
      throw new Error(`讀取收藏失敗：${error.message}`)
    }

    targets.push(...data)
    if (data.length < PAGE_SIZE) return targets
  }
}

// 今天已由各模組同步寫入的項目：直接沿用 data，不重複呼叫 API
async function loadFreshItemData(client: ServiceClient, itemIds: string[], since: number) {
  const fresh = new Map<string, Json>()
  const sinceIso = new Date(since).toISOString()

  for (const batch of chunk(itemIds, ITEM_QUERY_BATCH)) {
    const { data, error } = await client
      .from("radar_items")
      .select("id, data")
      .in("id", batch)
      .gte("last_seen_at", sinceIso)

    if (error) throw new Error(`讀取雷達項目失敗：${error.message}`)
    data.forEach(({ id, data: itemData }) => fresh.set(id, itemData))
  }

  return fresh
}

// -----------------------------------------------------------------------------
// 各來源的單獨查詢：回傳 collection id → 結果；查詢失敗時整批拋出，由呼叫端計入 failed
// -----------------------------------------------------------------------------

async function fetchGithub(targets: CollectionTarget[]) {
  const { GITHUB_TOKEN } = getServerEnv()
  // external_id 是 GraphQL node id，repo 改名仍查得到
  const { repos } = await refreshGithubRepos(
    GITHUB_TOKEN,
    targets.map((target) => target.external_id),
  )

  return new Map<string, Outcome>(
    targets.map((target) => {
      const repo = repos.get(target.external_id)
      if (!repo) return [target.id, { kind: "unavailable" }]

      const previous = previousData(target)
      const lastSearchHitAt = parseGithubRepoData(previous).last_search_hit_at ?? null
      return [target.id, { kind: "data", data: toGithubItemData(repo, previous, lastSearchHitAt) }]
    }),
  )
}

async function fetchHn(targets: CollectionTarget[]) {
  const stories = await fetchHnStoriesById(targets.map((target) => target.external_id))

  return new Map<string, Outcome>(
    targets.map((target) => {
      const story = stories.get(target.external_id)
      return [target.id, story ? { kind: "data", data: story } : { kind: "unavailable" }]
    }),
  )
}

// 項目超過 60 天被清理後，從整份 KEV 目錄比對；EPSS 一併重新查詢
async function fetchKev(targets: CollectionTarget[], catalog: KevEntry[], nowIso: string) {
  const entries = new Map(catalog.map((entry) => [entry.cveID, entry]))
  const cves = targets.map((target) => target.external_id.slice(KEV_PREFIX.length))
  const epss = await fetchEpssScores(cves.filter((cve) => entries.has(cve)))

  return new Map<string, Outcome>(
    targets.map((target, index) => {
      const entry = entries.get(cves[index])
      // CISA 撤除的項目不在目錄中
      if (!entry) return [target.id, { kind: "unavailable" }]

      const previous = parseKevData(previousData(target))
      const row = toKevRow(entry, epss.get(entry.cveID), previous, nowIso)
      return [target.id, { kind: "data", data: row.data }]
    }),
  )
}

async function fetchAdvisories(
  targets: CollectionTarget[],
  kevCves: ReadonlySet<string> | null,
  nowIso: string,
) {
  const { GITHUB_TOKEN } = getServerEnv()

  const outcomes = await mapWithConcurrency(
    targets,
    RADAR_COLLECTION_REFRESH.ADVISORY_CONCURRENCY,
    async (target): Promise<Outcome> => {
      const previous = parseAdvisoryData(previousData(target))
      const ghsa = target.external_id.slice(GHSA_PREFIX.length)
      const advisory = await fetchAdvisory(GITHUB_TOKEN, ghsa)
      // 404 或已撤回
      const normalized = advisory ? normalizeAdvisory(advisory, previous.ecosystem) : null
      if (!normalized) return { kind: "unavailable" }

      // 沒有讀取 KEV 目錄時沿用上一次的比對結果；npm 下載量沿用上一次的查詢
      const cves =
        kevCves ?? new Set(previous.in_kev && normalized.cve ? [normalized.cve.toUpperCase()] : [])
      const row = toAdvisoryRow(
        normalized,
        cves,
        {
          value: previous.npm_weekly_downloads,
          checkedAt: previous.npm_checked_at,
          belowThreshold: previous.below_threshold,
        },
        previous,
        nowIso,
      )
      return { kind: "data", data: row.data }
    },
  )

  return new Map(targets.map((target, index) => [target.id, outcomes[index]]))
}

// -----------------------------------------------------------------------------

async function writeOutcomes(
  client: ServiceClient,
  outcomes: Map<string, Outcome>,
  nowIso: string,
) {
  let failed = 0

  await mapWithConcurrency(
    [...outcomes],
    RADAR_COLLECTION_REFRESH.WRITE_CONCURRENCY,
    async ([id, outcome]) => {
      const { error } = await client
        .from("radar_collections")
        .update(
          outcome.kind === "data"
            ? { latest_data: outcome.data, latest_refreshed_at: nowIso, latest_unavailable: false }
            : { latest_unavailable: true },
        )
        .eq("id", id)

      if (error) {
        failed++
        console.error(`[radar] 更新收藏 ${id} 失敗：${error.message}`)
      }
    },
  )

  return failed
}

// 在各模組同步完後執行，只處理狀態不是「封存」的收藏；呼叫端負責捕捉錯誤，不影響各模組的同步結果
export async function refreshCollections(
  client: ServiceClient,
  { moduleKeys, since, deadline, now = Date.now() }: RefreshOptions,
): Promise<CollectionRefreshResult> {
  const nowIso = new Date(now).toISOString()
  const targets = await loadTargets(client, moduleKeys)
  const result: CollectionRefreshResult = {
    total: targets.length,
    copied: 0,
    fetched: 0,
    unavailable: 0,
    failed: 0,
    skipped: 0,
  }
  if (targets.length === 0) return result

  const fresh = await loadFreshItemData(
    client,
    targets.flatMap((target) => (target.item_id ? [target.item_id] : [])),
    since,
  )

  const outcomes = new Map<string, Outcome>()
  const stale: Record<"github" | "hn" | "kev" | "advisory", CollectionTarget[]> = {
    github: [],
    hn: [],
    kev: [],
    advisory: [],
  }

  targets.forEach((target) => {
    const data = target.item_id ? fresh.get(target.item_id) : undefined
    if (data !== undefined) {
      outcomes.set(target.id, { kind: "data", data })
      result.copied++
      return
    }

    if (target.module_key === RADAR_MODULE.GITHUB) stale.github.push(target)
    else if (target.module_key === RADAR_MODULE.HN) stale.hn.push(target)
    else if (target.external_id.startsWith(KEV_PREFIX)) stale.kev.push(target)
    else if (target.external_id.startsWith(GHSA_PREFIX)) stale.advisory.push(target)
    else result.skipped++
  })

  // KEV 目錄同時用於比對 KEV 收藏與 Advisory 的「已遭實際利用」，需要時只下載一次
  let catalog: KevEntry[] | null = null
  const loadCatalog = async () => (catalog ??= await fetchKevCatalog())

  const fetchers: Array<[CollectionTarget[], () => Promise<Map<string, Outcome>>]> = [
    [stale.github, () => fetchGithub(stale.github)],
    [stale.hn, () => fetchHn(stale.hn)],
    [stale.kev, async () => fetchKev(stale.kev, await loadCatalog(), nowIso)],
    [
      stale.advisory,
      () => {
        const kevCves = catalog ? new Set(catalog.map((entry) => entry.cveID.toUpperCase())) : null
        return fetchAdvisories(stale.advisory, kevCves, nowIso)
      },
    ],
  ]

  for (const [group, fetch] of fetchers) {
    if (group.length === 0) continue
    if (Date.now() > deadline) {
      result.skipped += group.length
      continue
    }

    try {
      const fetched = await fetch()
      fetched.forEach((outcome, id) => {
        outcomes.set(id, outcome)
        if (outcome.kind === "data") result.fetched++
        else result.unavailable++
      })
    } catch (error) {
      result.failed += group.length
      console.error(`[radar] 收藏最新數據查詢失敗（${group[0].module_key}）：`, error)
    }
  }

  result.failed += await writeOutcomes(client, outcomes, nowIso)
  return result
}
