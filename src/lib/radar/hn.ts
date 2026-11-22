import "server-only"

import { HN_SYNC, RADAR_COLLECTION_REFRESH, RADAR_MODULE, RADAR_WINDOW_DAYS } from "@/config/radar"
import { daysAgoIso } from "@/lib/radar/dates"
import { chunk, fetchJson } from "@/lib/radar/http"
import { removeRadarItems, upsertRadarItems } from "@/lib/radar/items"
import type { RadarSyncResult } from "@/lib/radar/sync-result"
import type { HnStoryData } from "@/lib/radar/types"
import type { ServiceClient } from "@/lib/supabase/service"

const ALGOLIA_SEARCH = "https://hn.algolia.com/api/v1/search"
const HN_ITEM_URL = "https://news.ycombinator.com/item?id="
const SHOW_HN_TAG = "show_hn"

type AlgoliaHit = {
  objectID: string
  title: string | null
  url: string | null
  author: string | null
  points: number | null
  num_comments: number | null
  created_at_i: number
  _tags?: string[]
}

type AlgoliaResponse = { hits: AlgoliaHit[] }

async function searchStories(tag: string, minPoints: number, since: number) {
  const params = new URLSearchParams({
    tags: tag,
    numericFilters: `created_at_i>${since},points>${minPoints}`,
    hitsPerPage: String(HN_SYNC.HITS_PER_PAGE),
  })
  const response = await fetchJson<AlgoliaResponse>(`${ALGOLIA_SEARCH}?${params}`)
  return response?.hits ?? []
}

function isHttpUrl(value: string | null): value is string {
  if (!value) return false
  try {
    const { protocol } = new URL(value)
    return protocol === "http:" || protocol === "https:"
  } catch {
    return false
  }
}

function toDomain(url: string) {
  return new URL(url).hostname.replace(/^www\./, "")
}

function toStoryData(hit: AlgoliaHit, externalUrl: string | null): HnStoryData {
  return {
    points: hit.points ?? 0,
    num_comments: hit.num_comments ?? 0,
    author: hit.author,
    hn_url: `${HN_ITEM_URL}${hit.objectID}`,
    domain: externalUrl ? toDomain(externalUrl) : null,
    is_show_hn: hit._tags?.includes(SHOW_HN_TAG) ?? false,
    posted_at: new Date(hit.created_at_i * 1000).toISOString(),
  }
}

function toRow(hit: AlgoliaHit, nowIso: string) {
  const hnUrl = `${HN_ITEM_URL}${hit.objectID}`
  // Ask HN 這類沒有外部連結的貼文直接連到 HN 討論頁
  const externalUrl = isHttpUrl(hit.url) ? hit.url : null
  const data = toStoryData(hit, externalUrl)

  return {
    module_key: RADAR_MODULE.HN,
    external_id: hit.objectID,
    title: hit.title?.trim() || "(無標題)",
    url: externalUrl ?? hnUrl,
    summary: null,
    categories: [],
    data,
    last_seen_at: nowIso,
  }
}

// HN 分數會持續變動，每天重抓近 7 天的 story 覆寫分數即可，不需要快照
export async function syncHn(client: ServiceClient, now: number): Promise<RadarSyncResult> {
  const nowIso = new Date(now).toISOString()
  const since = Math.floor(now / 1000) - RADAR_WINDOW_DAYS * 24 * 60 * 60

  const [stories, showHn] = await Promise.all([
    searchStories("story", HN_SYNC.STORY_MIN_POINTS, since),
    searchStories(SHOW_HN_TAG, HN_SYNC.SHOW_HN_MIN_POINTS, since),
  ])

  const hits = new Map([...stories, ...showHn].map((hit) => [hit.objectID, hit]))
  const rows = [...hits.values()].map((hit) => toRow(hit, nowIso))
  await upsertRadarItems(client, rows)

  const { data: expired, error } = await client
    .from("radar_items")
    .select("id")
    .eq("module_key", RADAR_MODULE.HN)
    .lt("data->>posted_at", daysAgoIso(now, HN_SYNC.RETENTION_DAYS))
  if (error) throw new Error(`讀取過期 HN 項目失敗：${error.message}`)

  const removed = await removeRadarItems(
    client,
    expired.map(({ id }) => id),
  )

  return {
    count: rows.length,
    details: { stories: stories.length, showHn: showHn.length, removed },
  }
}

// 以 story id 查詢最新分數與留言數（收藏每日更新用）：story_<id> 標籤可用 OR 一次查多筆，
// 回傳格式與同步時的搜尋結果相同，數字來源一致；查不到的 id（貼文已刪除）不會出現在結果中
export async function fetchHnStoriesById(ids: string[]): Promise<Map<string, HnStoryData>> {
  const stories = new Map<string, HnStoryData>()

  for (const batch of chunk(ids, RADAR_COLLECTION_REFRESH.HN_BATCH_SIZE)) {
    const params = new URLSearchParams({
      tags: `story,(${batch.map((id) => `story_${id}`).join(",")})`,
      hitsPerPage: String(batch.length),
    })
    const response = await fetchJson<AlgoliaResponse>(`${ALGOLIA_SEARCH}?${params}`)

    response?.hits.forEach((hit) => {
      if (!batch.includes(hit.objectID)) return
      stories.set(hit.objectID, toStoryData(hit, isHttpUrl(hit.url) ? hit.url : null))
    })
  }

  return stories
}
