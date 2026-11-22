import "server-only"

import { GITHUB_NPM, RADAR_MODULE } from "@/config/radar"
import { getServerEnv } from "@/lib/env"
import { taipeiDate } from "@/lib/radar/dates"
import { categorizeRepo } from "@/lib/radar/github/categorize"
import type { GithubRepo } from "@/lib/radar/github/client"
import { enrichNpmDownloads } from "@/lib/radar/github/npm"
import { pruneGithubPool, type PoolItem } from "@/lib/radar/github/prune"
import { refreshGithubRepos } from "@/lib/radar/github/refresh"
import { searchGithubCandidates } from "@/lib/radar/github/search"
import { chunk } from "@/lib/radar/http"
import { loadModuleItems, upsertRadarItems } from "@/lib/radar/items"
import type { RadarSyncResult } from "@/lib/radar/sync-result"
import { parseGithubRepoData } from "@/lib/radar/types"
import type { ServiceClient } from "@/lib/supabase/service"
import type { Json } from "@/types/database"

const SNAPSHOT_BATCH_SIZE = 500

// 收藏每日更新（collections/refresh.ts）也用這個函式組出與同步一致的 data
export function toGithubItemData(repo: GithubRepo, previous: Json, lastSearchHitAt: string | null) {
  const { isList } = categorizeRepo(repo)

  return {
    // 保留 npm 快取等不是由 GitHub 提供的欄位
    ...(previous && typeof previous === "object" && !Array.isArray(previous) ? previous : {}),
    language: repo.language,
    topics: repo.topics,
    license: repo.license,
    stars: repo.stars,
    forks: repo.forks,
    archived: repo.archived,
    is_fork: repo.isFork,
    is_list: isList,
    pushed_at: repo.pushedAt,
    repo_created_at: repo.createdAt,
    last_search_hit_at: lastSearchHitAt,
  }
}

// 1. 搜尋補充候選池 → 2. GraphQL 更新整池 star 數並寫入今日快照 → 3. 前 30 名補 npm 下載量 → 4. 移出過期候選
export async function syncGithub(client: ServiceClient, now: number): Promise<RadarSyncResult> {
  const { GITHUB_TOKEN } = getServerEnv()
  const nowIso = new Date(now).toISOString()
  const today = taipeiDate(now)

  const existing = await loadModuleItems(client, RADAR_MODULE.GITHUB)
  const existingByNodeId = new Map(existing.map((item) => [item.external_id, item]))
  const hits = await searchGithubCandidates(GITHUB_TOKEN, now)

  const nodeIds = [...new Set([...existingByNodeId.keys(), ...hits.keys()])]
  const { repos, missing } = await refreshGithubRepos(GITHUB_TOKEN, nodeIds)

  const rows = nodeIds.flatMap((nodeId) => {
    // 剛建立的 repo 偶爾還查不到 GraphQL 節點，先沿用搜尋結果
    const repo = repos.get(nodeId) ?? hits.get(nodeId)
    if (!repo) return []

    const previous = existingByNodeId.get(nodeId)?.data ?? {}
    const lastSearchHitAt = hits.has(nodeId)
      ? nowIso
      : (parseGithubRepoData(previous).last_search_hit_at ?? null)

    return [
      {
        module_key: RADAR_MODULE.GITHUB,
        external_id: nodeId,
        title: repo.fullName,
        url: repo.url,
        summary: repo.description,
        categories: categorizeRepo(repo).categories,
        data: toGithubItemData(repo, previous, lastSearchHitAt),
        last_seen_at: nowIso,
      },
    ]
  })

  const idsByNodeId = await upsertRadarItems(client, rows)

  const snapshots = rows.flatMap((row) => {
    const itemId = idsByNodeId.get(row.external_id)
    return itemId ? [{ item_id: itemId, snapshot_date: today, value: row.data.stars }] : []
  })
  for (const batch of chunk(snapshots, SNAPSHOT_BATCH_SIZE)) {
    const { error } = await client
      .from("radar_metric_snapshots")
      .upsert(batch, { onConflict: "item_id,snapshot_date" })
    if (error) throw new Error(`寫入快照失敗：${error.message}`)
  }

  const { data: ranked, error: rankingError } = await client.rpc("radar_github_ranking", {
    p_limit: GITHUB_NPM.TOP_N,
  })
  if (rankingError) throw new Error(`計算排名失敗：${rankingError.message}`)
  const npmEnriched = await enrichNpmDownloads(client, ranked, now)

  const pool: PoolItem[] = rows.flatMap((row) => {
    const id = idsByNodeId.get(row.external_id)
    if (!id) return []
    return [
      {
        id,
        isBlocked: existingByNodeId.get(row.external_id)?.is_blocked ?? false,
        lastSearchHitAt: row.data.last_search_hit_at,
      },
    ]
  })
  const missingItemIds = missing
    .filter((nodeId) => !hits.has(nodeId))
    .flatMap((nodeId) => existingByNodeId.get(nodeId)?.id ?? [])
  const pruned = await pruneGithubPool(client, pool, missingItemIds, now)

  return {
    count: rows.length - pruned,
    details: {
      searchHits: hits.size,
      snapshots: snapshots.length,
      npmEnriched,
      pruned,
    },
  }
}
