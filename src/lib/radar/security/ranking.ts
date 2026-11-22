import { SECURITY_TOPICS, type SecurityTopic } from "@/config/radar"
import { parseAdvisoryData, parseKevData } from "@/lib/radar/types"
import type { Database } from "@/types/database"

type Functions = Database["public"]["Functions"]
type SecurityRankingRow = Functions["radar_security_kev_ranking"]["Returns"][number]

// 前台與後台共用的資安榜單項目格式，資料皆來自排名函式
type SecurityRankingBase = {
  id: string
  title: string
  url: string
  topics: SecurityTopic[]
  cwes: string[]
  watchKeywords: string[]
  epss: number | null
  epssPercentile: number | null
}

export type KevRankingItem = SecurityRankingBase & {
  cve: string
  vendor: string | null
  product: string | null
  ransomware: boolean
  cvss: { score: number; version: string } | null
  dateAdded: string
  dueDate: string | null
  shortDescription: string | null
  requiredAction: string | null
}

export type AdvisoryRankingItem = SecurityRankingBase & {
  ghsa: string
  cve: string | null
  // 惡意套件公告的 severity 為 malware
  severity: string
  isMalware: boolean
  ecosystem: string
  packageName: string
  vulnerableRange: string | null
  patchedVersion: string | null
  npmWeeklyDownloads: number | null
  inKev: boolean
  publishedAt: string
}

export type SecurityRanking = {
  kev: KevRankingItem[]
  advisory: AdvisoryRankingItem[]
}

const TOPIC_SET = new Set<string>(SECURITY_TOPICS)

function toTopics(categories: string[]) {
  return categories.filter((topic): topic is SecurityTopic => TOPIC_SET.has(topic))
}

export function toKevRankingItem(row: SecurityRankingRow): KevRankingItem {
  const data = parseKevData(row.data)

  return {
    id: row.item_id,
    title: row.title,
    url: row.url,
    topics: toTopics(row.categories),
    cwes: data.cwes,
    watchKeywords: data.watch_keywords,
    epss: data.epss,
    epssPercentile: data.epss_percentile,
    cve: data.cve,
    vendor: data.vendor,
    product: data.product,
    ransomware: data.ransomware,
    cvss: data.cvss ?? null,
    dateAdded: data.date_added,
    dueDate: data.due_date,
    shortDescription: data.short_description,
    requiredAction: data.required_action,
  }
}

export function toAdvisoryRankingItem(row: SecurityRankingRow): AdvisoryRankingItem {
  const data = parseAdvisoryData(row.data)

  return {
    id: row.item_id,
    title: row.title,
    url: row.url,
    topics: toTopics(row.categories),
    cwes: data.cwes,
    watchKeywords: data.watch_keywords,
    epss: data.epss,
    epssPercentile: data.epss_percentile,
    ghsa: data.ghsa,
    cve: data.cve,
    severity: data.severity,
    isMalware: data.type === "malware",
    ecosystem: data.ecosystem,
    packageName: data.package,
    vulnerableRange: data.vulnerable_range,
    patchedVersion: data.patched_version,
    npmWeeklyDownloads: data.npm_weekly_downloads ?? null,
    inKev: data.in_kev,
    publishedAt: data.published_at,
  }
}

// 主題篩選：前台在瀏覽器、後台在伺服器端，共用同一個判斷
export function filterByTopic<T extends { topics: SecurityTopic[] }>(
  items: T[],
  topic: SecurityTopic | null,
) {
  return topic ? items.filter((item) => item.topics.includes(topic)) : items
}
