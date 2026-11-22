import "server-only"

import type { Route } from "next"
import { cacheLife, cacheTag } from "next/cache"

import {
  isRadarModuleKey,
  RADAR_CANDIDATE_LIMIT,
  RADAR_MODULE_META,
  type RadarModuleKey,
} from "@/config/radar"
import { CACHE_TAG } from "@/lib/cache-tags"
import {
  toGithubRanking,
  toHnRankingItem,
  type GithubRanking,
  type HnRankingItem,
} from "@/lib/radar/ranking"
import {
  toAdvisoryRankingItem,
  toKevRankingItem,
  type SecurityRanking,
} from "@/lib/radar/security/ranking"
import { createPublicClient } from "@/lib/supabase/public"

export type PublicRadarModule = {
  key: RadarModuleKey
  label: string
  description: string
  href: Route
  lastSyncedAt: string | null
}

export type HnRanking = {
  top: HnRankingItem[]
  show: HnRankingItem[]
}

// 導覽列、總覽頁與各榜單頁共用；只有後台設為公開的模組會出現
// 導覽列出現在每一頁，讀取失敗（例如資料庫尚未執行雷達遷移）時視為沒有公開模組，只短暫快取，
// 不可往外丟錯：Cache Components 預渲染時 "use cache" 內的錯誤即使被呼叫端攔截，仍會讓整頁建置失敗
export async function getPublicRadarModules(): Promise<PublicRadarModule[]> {
  "use cache"
  cacheTag(CACHE_TAG.RADAR)

  const { data, error } = await createPublicClient().rpc("get_public_radar_modules")

  if (error) {
    console.error(`[radar] 讀取公開模組失敗：${error.message}`)
    cacheLife("minutes")
    return []
  }

  cacheLife("hours")

  return data.flatMap(({ key, last_synced_at }) => {
    if (!isRadarModuleKey(key)) return []
    const meta = RADAR_MODULE_META[key]
    return [
      {
        key,
        label: meta.label,
        description: meta.description,
        href: meta.publicPath,
        lastSyncedAt: last_synced_at,
      },
    ]
  })
}

export async function getPublicRadarModule(key: RadarModuleKey) {
  const modules = await getPublicRadarModules()
  return modules.find((module) => module.key === key) ?? null
}

// RPC 已排除隱藏項目並檢查模組為公開；多取幾筆候選，讓前台篩選語言後仍能湊滿 10 名
export async function getGithubWeeklyRanking(): Promise<GithubRanking> {
  "use cache"
  cacheLife("hours")
  cacheTag(CACHE_TAG.RADAR)

  const { data, error } = await createPublicClient().rpc("get_github_weekly_ranking", {
    p_limit: RADAR_CANDIDATE_LIMIT,
  })

  if (error) throw new Error(`讀取 GitHub 週榜失敗：${error.message}`)

  return toGithubRanking(data)
}

export async function getHnWeeklyRanking(): Promise<HnRanking> {
  "use cache"
  cacheLife("hours")
  cacheTag(CACHE_TAG.RADAR)

  const client = createPublicClient()
  const [top, show] = await Promise.all([
    client.rpc("get_hn_weekly_ranking", { p_show_hn: false, p_limit: RADAR_CANDIDATE_LIMIT }),
    client.rpc("get_hn_weekly_ranking", { p_show_hn: true, p_limit: RADAR_CANDIDATE_LIMIT }),
  ])

  const error = top.error ?? show.error
  if (error) throw new Error(`讀取 HN 週榜失敗：${error.message}`)

  return {
    top: (top.data ?? []).map(toHnRankingItem),
    show: (show.data ?? []).map(toHnRankingItem),
  }
}

// 兩個資安榜單一起讀取：同一頁的兩個分頁與總覽頁區塊共用；多取幾筆候選讓主題篩選後仍能湊滿 10 名
export async function getSecurityRanking(): Promise<SecurityRanking> {
  "use cache"
  cacheLife("hours")
  cacheTag(CACHE_TAG.RADAR)

  const client = createPublicClient()
  const [kev, advisory] = await Promise.all([
    client.rpc("get_security_kev_ranking", { p_limit: RADAR_CANDIDATE_LIMIT }),
    client.rpc("get_security_advisory_ranking", { p_limit: RADAR_CANDIDATE_LIMIT }),
  ])

  const error = kev.error ?? advisory.error
  if (error) throw new Error(`讀取資安榜單失敗：${error.message}`)

  return {
    kev: (kev.data ?? []).map(toKevRankingItem),
    advisory: (advisory.data ?? []).map(toAdvisoryRankingItem),
  }
}
