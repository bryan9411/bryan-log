import "server-only"

import {
  isRadarModuleKey,
  RADAR_COLLECTION_STATUS,
  RADAR_MODULE_META,
  type RadarCollectionStatus,
  type RadarModuleKey,
} from "@/config/radar"
import {
  compareCollection,
  COLLECTION_LIST_LABEL,
  snapshotSummary,
  type CollectionComparison,
} from "@/lib/radar/collections/compare"
import { isMissingTableError } from "@/lib/supabase/errors"
import { createClient } from "@/lib/supabase/server"
import {
  ALL_FILTER,
  RADAR_COLLECTION_STATUS_FILTERS,
  RADAR_COLLECTIONS_PAGE_SIZE,
  type AdminRadarCollectionListParams,
  type RadarCollectionStatusFilter,
} from "@/lib/validations/radar-collection"

// 收藏一律私人：只在後台以登入者身分讀取（RLS 只開放 authenticated），不快取

const PAGE_SIZE = 1000

export type AdminRadarCollectionListItem = {
  id: string
  title: string
  url: string
  moduleKey: RadarModuleKey
  listLabel: string
  status: RadarCollectionStatus
  tags: string[]
  savedAt: string
  // 還沒有最新數據時為 null
  latestRefreshedAt: string | null
  latestUnavailable: boolean
  change: string | null
}

export type AdminRadarCollectionListPage = {
  collections: AdminRadarCollectionListItem[]
  total: number
  // 實際顯示的頁碼：網址頁碼超出範圍時會被校正為最後一頁
  page: number
  pageCount: number
  // 套用模組、標籤與標題篩選後，各狀態分頁的筆數
  statusCounts: Record<RadarCollectionStatusFilter, number>
}

export type AdminRadarCollectionDetail = {
  id: string
  title: string
  url: string
  moduleKey: RadarModuleKey
  moduleLabel: string
  listLabel: string
  // 項目仍在榜單候選池中（尚未被清理）
  inPool: boolean
  status: RadarCollectionStatus
  note: string
  tags: string[]
  savedAt: string
  latestRefreshedAt: string | null
  latestUnavailable: boolean
  summary: string | null
  comparison: CollectionComparison
}

// 使用者輸入的 % 與 _ 視為一般字元
function toLikePattern(query: string) {
  return `%${query.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
}

function getPageCount(total: number) {
  return Math.max(1, Math.ceil(total / RADAR_COLLECTIONS_PAGE_SIZE))
}

function emptyStatusCounts() {
  return Object.fromEntries(RADAR_COLLECTION_STATUS_FILTERS.map((status) => [status, 0])) as Record<
    RadarCollectionStatusFilter,
    number
  >
}

// 先取出符合模組／標籤／標題篩選的所有收藏（只取 id 與狀態）算出各狀態筆數，再取當頁的完整欄位；
// 收藏是個人研究清單，數量有限，這樣篩選條件只需寫一次，也不必為每個狀態各查一次筆數
async function loadFilteredIndex({ module, tag, query }: AdminRadarCollectionListParams) {
  const supabase = await createClient()
  const rows: Array<{ id: string; status: RadarCollectionStatus }> = []

  for (let from = 0; ; from += PAGE_SIZE) {
    let request = supabase
      .from("radar_collections")
      .select("id, status")
      .order("saved_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (module !== ALL_FILTER) request = request.eq("module_key", module)
    if (tag) request = request.contains("tags", [tag])
    if (query) request = request.ilike("title", toLikePattern(query))

    const { data, error } = await request
    if (error) return { rows, error }

    rows.push(...data)
    if (data.length < PAGE_SIZE) return { rows, error: null }
  }
}

// 收藏遷移尚未執行時回傳 null，由頁面提示執行遷移
export async function listAdminRadarCollections(
  params: AdminRadarCollectionListParams,
): Promise<AdminRadarCollectionListPage | null> {
  const { rows, error } = await loadFilteredIndex(params)
  if (error) {
    if (isMissingTableError(error)) return null
    throw new Error(`讀取收藏列表失敗：${error.message}`)
  }

  const statusCounts = emptyStatusCounts()
  rows.forEach(({ status }) => statusCounts[status]++)
  statusCounts[ALL_FILTER] = rows.length

  const matched =
    params.status === ALL_FILTER ? rows : rows.filter(({ status }) => status === params.status)
  const total = matched.length
  const pageCount = getPageCount(total)
  // 刪除最後一頁的所有收藏或手動輸入過大的頁碼時，改顯示最後一頁而不是空白
  const page = Math.min(params.page, pageCount)
  const pageIds = matched
    .slice((page - 1) * RADAR_COLLECTIONS_PAGE_SIZE, page * RADAR_COLLECTIONS_PAGE_SIZE)
    .map(({ id }) => id)

  if (pageIds.length === 0) {
    return { collections: [], total, page, pageCount, statusCounts }
  }

  const supabase = await createClient()
  const { data, error: pageError } = await supabase
    .from("radar_collections")
    .select(
      "id, title, url, module_key, status, tags, saved_at, snapshot_at_save, latest_data, latest_refreshed_at, latest_unavailable",
    )
    .in("id", pageIds)

  if (pageError) throw new Error(`讀取收藏列表失敗：${pageError.message}`)

  const byId = new Map(data.map((row) => [row.id, row]))
  const collections = pageIds.flatMap((id): AdminRadarCollectionListItem[] => {
    const row = byId.get(id)
    if (!row || !isRadarModuleKey(row.module_key)) return []

    const comparison = compareCollection(row.module_key, row.snapshot_at_save, row.latest_data)
    return [
      {
        id: row.id,
        title: row.title,
        url: row.url,
        moduleKey: row.module_key,
        listLabel: COLLECTION_LIST_LABEL[comparison.list],
        status: row.status,
        tags: row.tags,
        savedAt: row.saved_at,
        latestRefreshedAt: row.latest_refreshed_at,
        latestUnavailable: row.latest_unavailable,
        change: comparison.summary,
      },
    ]
  })

  return { collections, total, page, pageCount, statusCounts }
}

// 標籤篩選的選項：所有收藏用過的標籤，依使用次數排序
export async function listRadarCollectionTags(): Promise<string[]> {
  const supabase = await createClient()
  const counts = new Map<string, number>()

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("radar_collections")
      .select("tags")
      .order("id")
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      if (isMissingTableError(error)) return []
      throw new Error(`讀取收藏標籤失敗：${error.message}`)
    }

    data.forEach(({ tags }) => tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)))
    if (data.length < PAGE_SIZE) break
  }

  return [...counts]
    .sort(([a, countA], [b, countB]) => countB - countA || a.localeCompare(b, "zh-TW"))
    .map(([tag]) => tag)
}

export async function getAdminRadarCollection(
  id: string,
): Promise<AdminRadarCollectionDetail | null> {
  const supabase = await createClient()
  const { data: row, error } = await supabase
    .from("radar_collections")
    .select(
      "id, item_id, title, url, module_key, status, note, tags, saved_at, snapshot_at_save, latest_data, latest_refreshed_at, latest_unavailable",
    )
    .eq("id", id)
    .maybeSingle()

  if (error) {
    if (isMissingTableError(error)) return null
    throw new Error(`讀取收藏失敗：${error.message}`)
  }
  if (!row || !isRadarModuleKey(row.module_key)) return null

  const comparison = compareCollection(row.module_key, row.snapshot_at_save, row.latest_data)

  return {
    id: row.id,
    title: row.title,
    url: row.url,
    moduleKey: row.module_key,
    moduleLabel: RADAR_MODULE_META[row.module_key].label,
    listLabel: COLLECTION_LIST_LABEL[comparison.list],
    inPool: row.item_id !== null,
    status: row.status,
    note: row.note,
    tags: row.tags,
    savedAt: row.saved_at,
    latestRefreshedAt: row.latest_refreshed_at,
    latestUnavailable: row.latest_unavailable,
    summary: snapshotSummary(row.snapshot_at_save),
    comparison,
  }
}

export type CollectionDashboardCounts = Record<
  typeof RADAR_COLLECTION_STATUS.TO_RESEARCH | typeof RADAR_COLLECTION_STATUS.EVALUATING,
  number
>

// 儀表板統計卡；收藏遷移尚未執行時回傳 null，不顯示統計卡
export async function getCollectionDashboardCounts(): Promise<CollectionDashboardCounts | null> {
  const supabase = await createClient()
  // 不用 head 請求：HEAD 回應沒有內容，資料表不存在時拿不到錯誤代碼
  const countStatus = (status: RadarCollectionStatus) =>
    supabase
      .from("radar_collections")
      .select("id", { count: "exact" })
      .eq("status", status)
      .limit(1)

  const [toResearch, evaluating] = await Promise.all([
    countStatus(RADAR_COLLECTION_STATUS.TO_RESEARCH),
    countStatus(RADAR_COLLECTION_STATUS.EVALUATING),
  ])

  const error = toResearch.error ?? evaluating.error
  if (error) {
    if (isMissingTableError(error)) return null
    throw new Error(`統計收藏失敗：${error.message}`)
  }

  return {
    [RADAR_COLLECTION_STATUS.TO_RESEARCH]: toResearch.count ?? 0,
    [RADAR_COLLECTION_STATUS.EVALUATING]: evaluating.count ?? 0,
  }
}
