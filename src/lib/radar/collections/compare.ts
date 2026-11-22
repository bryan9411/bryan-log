import { RADAR_MODULE, SECURITY_SEVERITY_LABEL, type RadarModuleKey } from "@/config/radar"
import { formatCompactNumber, formatDate, formatInteger, formatProbability } from "@/lib/format"
import {
  parseAdvisoryData,
  parseGithubRepoData,
  parseHnStoryData,
  parseKevData,
} from "@/lib/radar/types"
import type { Json } from "@/types/database"

// 收藏「當下」與「最新」的對照：snapshot_at_save.data 與 latest_data 都和 radar_items.data 同格式，
// 依榜單種類挑出值得比較的欄位，格式化成文字後交給畫面，不在前端重複解析 JSON

export type CollectionList = "github" | "hn" | "kev" | "advisory"

export const COLLECTION_LIST_LABEL: Record<CollectionList, string> = {
  github: "GitHub",
  hn: "Hacker News",
  kev: "資安・實戰遭利用",
  advisory: "資安・開發生態漏洞",
}

export type CollectionChangeDirection = "up" | "down" | "changed"

export type CollectionMetricRow = {
  key: string
  label: string
  saved: string
  latest: string
  // null 代表沒有變化（或還沒有最新數據）
  change: { text: string; direction: CollectionChangeDirection } | null
}

export type CollectionContextRow = { label: string; value: string }

export type CollectionComparison = {
  list: CollectionList
  // 收藏當下的排名情境（名次、統計期間等），只有收藏當下的值
  context: CollectionContextRow[]
  metrics: CollectionMetricRow[]
  // 列表「收藏後變化」欄的一句話摘要，null 代表沒有明顯變化
  summary: string | null
}

const EMPTY = "—"

type JsonRecord = Record<string, Json | undefined>

function asRecord(value: Json | null | undefined): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {}
}

function numberOrNull(value: Json | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function stringOrNull(value: Json | undefined) {
  return typeof value === "string" && value ? value : null
}

function signed(value: number, format: (value: number) => string = formatInteger) {
  return value > 0 ? `+${format(value)}` : `−${format(Math.abs(value))}`
}

function formatOptionalDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : formatDate(date)
}

const yesNo = (value: boolean) => (value ? "是" : "否")

// -----------------------------------------------------------------------------
// 對照列的組法：latest 為 undefined 代表還沒有最新數據，只顯示收藏當下
// -----------------------------------------------------------------------------

function numberRow(
  key: string,
  label: string,
  saved: number | null | undefined,
  latest: number | null | undefined,
  format: (value: number) => string = formatInteger,
): CollectionMetricRow {
  const hasLatest = latest !== undefined
  const savedValue = saved ?? null
  const latestValue = latest ?? null
  let change: CollectionMetricRow["change"] = null

  if (hasLatest && savedValue !== null && latestValue !== null && savedValue !== latestValue) {
    const delta = latestValue - savedValue
    change = { text: signed(delta, format), direction: delta > 0 ? "up" : "down" }
  } else if (hasLatest && (savedValue === null) !== (latestValue === null)) {
    change = { text: latestValue === null ? "已移除" : "新增", direction: "changed" }
  }

  return {
    key,
    label,
    saved: savedValue === null ? EMPTY : format(savedValue),
    latest: !hasLatest || latestValue === null ? EMPTY : format(latestValue),
    change,
  }
}

// 機率類（EPSS）差異以百分點表示，例如 +29 個百分點
function probabilityRow(
  key: string,
  label: string,
  saved: number | null,
  latest: number | null | undefined,
): CollectionMetricRow {
  const row = numberRow(key, label, saved, latest, formatProbability)
  if (row.change && saved !== null && typeof latest === "number") {
    const points = Math.round((latest - saved) * 1000) / 10
    if (points === 0) return { ...row, change: null }
    row.change = {
      text: `${points > 0 ? "+" : "−"}${Math.abs(points)} 個百分點`,
      direction: points > 0 ? "up" : "down",
    }
  }
  return row
}

function textRow(
  key: string,
  label: string,
  saved: string | null,
  latest: string | null | undefined,
  changedText = "已變更",
): CollectionMetricRow {
  const hasLatest = latest !== undefined
  return {
    key,
    label,
    saved: saved ?? EMPTY,
    latest: !hasLatest || latest === null ? EMPTY : latest,
    change: hasLatest && saved !== latest ? { text: changedText, direction: "changed" } : null,
  }
}

// -----------------------------------------------------------------------------
// 各榜單
// -----------------------------------------------------------------------------

type Builder = (input: {
  saved: Json
  latest: Json | null
  ranking: JsonRecord
}) => Omit<CollectionComparison, "list">

function rankText(value: Json | undefined) {
  const rank = numberOrNull(value)
  return rank === null ? "榜外" : `第 ${rank} 名`
}

const buildGithub: Builder = ({ saved, latest, ranking }) => {
  const before = parseGithubRepoData(saved)
  const after = latest === null ? null : parseGithubRepoData(latest)
  const pick = <T>(read: (data: typeof before) => T) => (after ? read(after) : undefined)

  const periodStart = stringOrNull(ranking.period_start)
  const periodEnd = stringOrNull(ranking.period_end)
  const weeklyStars = numberOrNull(ranking.weekly_stars)

  const context: CollectionContextRow[] = [
    { label: "收藏時名次", value: rankText(ranking.rank) },
    { label: "收藏時本週 +star", value: weeklyStars === null ? EMPTY : signed(weeklyStars) },
  ]
  if (periodStart && periodEnd) {
    // 快照只有一天（資料累積中）時起訖相同，只顯示一個日期
    const period = periodStart === periodEnd ? periodEnd : `${periodStart} ～ ${periodEnd}`
    context.push({ label: "統計期間", value: period })
  }

  const metrics = [
    numberRow(
      "stars",
      "總 star",
      before.stars,
      pick((data) => data.stars),
    ),
    numberRow(
      "forks",
      "Fork",
      before.forks,
      pick((data) => data.forks),
    ),
  ]
  if (before.npm_weekly_downloads != null || after?.npm_weekly_downloads != null) {
    metrics.push(
      numberRow(
        "npm",
        "npm 週下載量",
        before.npm_weekly_downloads,
        pick((data) => data.npm_weekly_downloads ?? null),
        formatCompactNumber,
      ),
    )
  }
  metrics.push(
    textRow(
      "pushed",
      "最後推送",
      formatOptionalDate(before.pushed_at),
      pick((data) => formatOptionalDate(data.pushed_at)),
      "有新推送",
    ),
    textRow(
      "language",
      "語言",
      before.language,
      pick((data) => data.language),
    ),
    textRow(
      "license",
      "授權",
      before.license,
      pick((data) => data.license),
    ),
    textRow(
      "archived",
      "已封存（唯讀）",
      yesNo(before.archived),
      pick((data) => yesNo(data.archived)),
    ),
  )

  const starDelta = after ? after.stars - before.stars : 0
  let summary: string | null =
    starDelta === 0 ? null : `★ ${signed(starDelta, formatCompactNumber)}`
  if (after?.archived && !before.archived) summary = summary ? `${summary}・已封存` : "已封存"

  return { context, metrics, summary }
}

const buildHn: Builder = ({ saved, latest, ranking }) => {
  const before = parseHnStoryData(saved)
  const after = latest === null ? null : parseHnStoryData(latest)

  const context: CollectionContextRow[] = [
    { label: "收藏時熱門討論名次", value: rankText(ranking.rank) },
  ]
  if (before.is_show_hn) {
    context.push({ label: "收藏時 Show HN 名次", value: rankText(ranking.show_hn_rank) })
  }

  const metrics = [
    numberRow("points", "分數", before.points, after?.points),
    numberRow("comments", "留言數", before.num_comments, after?.num_comments),
  ]

  const parts: string[] = []
  if (after && after.points !== before.points) {
    parts.push(`${signed(after.points - before.points)} 分`)
  }
  if (after && after.num_comments !== before.num_comments) {
    parts.push(`${signed(after.num_comments - before.num_comments)} 留言`)
  }

  return { context, metrics, summary: parts.length > 0 ? parts.join("・") : null }
}

function epssSummary(before: number | null, after: number | null | undefined) {
  if (after === undefined || before === after) return null
  if (before === null || after === null) return null
  // 四捨五入後看起來一樣的微小變動不算變化
  const from = formatProbability(before)
  const to = formatProbability(after)
  return from === to ? null : `EPSS ${from} → ${to}`
}

const buildKev: Builder = ({ saved, latest, ranking }) => {
  const before = parseKevData(saved)
  const after = latest === null ? null : parseKevData(latest)

  const context: CollectionContextRow[] = [
    { label: "收藏時名次", value: rankText(ranking.rank) },
    { label: "加入 KEV", value: before.date_added || EMPTY },
  ]

  const metrics = [
    probabilityRow("epss", "EPSS", before.epss, after ? after.epss : undefined),
    probabilityRow(
      "epss_percentile",
      "EPSS 百分位",
      before.epss_percentile,
      after ? after.epss_percentile : undefined,
    ),
    numberRow(
      "cvss",
      "CVSS",
      before.cvss?.score ?? null,
      after ? (after.cvss?.score ?? null) : undefined,
      (value) => value.toFixed(1),
    ),
    textRow(
      "ransomware",
      "勒索軟體利用",
      yesNo(before.ransomware),
      after ? yesNo(after.ransomware) : undefined,
    ),
    textRow("due_date", "修補期限", before.due_date, after ? after.due_date : undefined),
  ]

  let summary = epssSummary(before.epss, after?.epss)
  if (after?.ransomware && !before.ransomware) {
    summary = summary ? `${summary}・勒索軟體利用` : "新增勒索軟體利用"
  }

  return { context, metrics, summary }
}

const severityLabel = (value: string) => SECURITY_SEVERITY_LABEL[value] ?? (value || null)

const buildAdvisory: Builder = ({ saved, latest, ranking }) => {
  const before = parseAdvisoryData(saved)
  const after = latest === null ? null : parseAdvisoryData(latest)

  const context: CollectionContextRow[] = [
    { label: "收藏時名次", value: rankText(ranking.rank) },
    { label: "套件", value: before.package ? `${before.ecosystem} · ${before.package}` : EMPTY },
  ]

  const metrics = [
    textRow(
      "severity",
      "等級",
      severityLabel(before.severity),
      after ? severityLabel(after.severity) : undefined,
    ),
    probabilityRow("epss", "EPSS", before.epss, after ? after.epss : undefined),
    textRow(
      "patched",
      "修補版本",
      before.patched_version ?? "尚無",
      after ? (after.patched_version ?? "尚無") : undefined,
    ),
    textRow(
      "in_kev",
      "已遭實際利用（KEV）",
      yesNo(before.in_kev),
      after ? yesNo(after.in_kev) : undefined,
    ),
  ]
  if (before.npm_weekly_downloads != null || after?.npm_weekly_downloads != null) {
    metrics.push(
      numberRow(
        "npm",
        "npm 週下載量",
        before.npm_weekly_downloads,
        after ? (after.npm_weekly_downloads ?? null) : undefined,
        formatCompactNumber,
      ),
    )
  }

  const parts: string[] = []
  const epss = epssSummary(before.epss, after?.epss)
  if (epss) parts.push(epss)
  if (after?.patched_version && !before.patched_version) {
    parts.push(`已修補 ${after.patched_version}`)
  }
  if (after?.in_kev && !before.in_kev) parts.push("已遭實際利用")

  return { context, metrics, summary: parts.length > 0 ? parts.join("・") : null }
}

const BUILDERS: Record<CollectionList, Builder> = {
  github: buildGithub,
  hn: buildHn,
  kev: buildKev,
  advisory: buildAdvisory,
}

// 資安模組有兩個榜單：優先看快照記下的榜單，舊資料再以 data.source 判斷
export function resolveCollectionList(moduleKey: RadarModuleKey, snapshot: Json): CollectionList {
  if (moduleKey === RADAR_MODULE.GITHUB) return "github"
  if (moduleKey === RADAR_MODULE.HN) return "hn"

  const record = asRecord(snapshot)
  const list = asRecord(record.ranking).list
  if (list === "kev" || list === "advisory") return list
  return asRecord(record.data).source === "advisory" ? "advisory" : "kev"
}

export function compareCollection(
  moduleKey: RadarModuleKey,
  snapshot: Json,
  latest: Json | null,
): CollectionComparison {
  const record = asRecord(snapshot)
  const list = resolveCollectionList(moduleKey, snapshot)

  return {
    list,
    ...BUILDERS[list]({
      saved: record.data ?? {},
      latest,
      ranking: asRecord(record.ranking),
    }),
  }
}

// 收藏當下的摘要（例如 repo 描述、漏洞簡述），詳細頁標題下方顯示
export function snapshotSummary(snapshot: Json) {
  return stringOrNull(asRecord(snapshot).summary)
}
