import "server-only"

import { SECURITY_KEV } from "@/config/radar"
import { isCweId } from "@/config/cwe-labels"
import { taipeiDate } from "@/lib/radar/dates"
import { chunk, fetchJson } from "@/lib/radar/http"

const KEV_FEED_URL =
  "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
const EPSS_API_URL = "https://api.first.org/data/v1/epss"
// 整份 KEV 約 1,800 筆、數 MB，給較長的逾時
const KEV_TIMEOUT_MS = 60_000

// 欄位已對照 CISA 官方 schema
export type KevEntry = {
  cveID: string
  vendorProject?: string
  product?: string
  vulnerabilityName?: string
  dateAdded: string
  shortDescription?: string
  requiredAction?: string
  dueDate?: string
  knownRansomwareCampaignUse?: string
  notes?: string
  cwes?: string[]
}

type KevCatalog = { vulnerabilities?: KevEntry[] }

type EpssResponse = {
  data?: Array<{ cve: string; epss: string; percentile: string }>
}

export type EpssScore = { epss: number; percentile: number }

const CVE_PATTERN = /^CVE-\d{4}-\d{4,}$/

// 每天重新讀取整份 KEV：CISA 常在事後才把勒索軟體欄位改成 Known，整份重讀才能反映
export async function fetchKevCatalog(): Promise<KevEntry[]> {
  const catalog = await fetchJson<KevCatalog>(KEV_FEED_URL, { timeoutMs: KEV_TIMEOUT_MS })
  const entries = catalog?.vulnerabilities
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("CISA KEV 沒有回傳任何漏洞，可能是格式變更")
  }
  return entries.filter((entry) => CVE_PATTERN.test(entry.cveID ?? ""))
}

// 只保留近 N 天（台灣日期）加入的項目；dateAdded 格式為 YYYY-MM-DD，可直接以字串比較
export function selectRecentKev(entries: KevEntry[], now: number) {
  const since = taipeiDate(now, -SECURITY_KEV.RETENTION_DAYS)
  return entries.filter((entry) => entry.dateAdded >= since)
}

export function isKnownRansomware(entry: KevEntry) {
  return entry.knownRansomwareCampaignUse?.trim().toLowerCase() === "known"
}

export function normalizeCwes(values: string[] | undefined) {
  return [...new Set((values ?? []).map((value) => value.trim().toUpperCase()))].filter(isCweId)
}

function toNumber(value: string) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

// FIRST EPSS 一次最多 100 個 CVE；查不到分數的 CVE（例如剛公開）不會出現在結果中
export async function fetchEpssScores(cves: string[]): Promise<Map<string, EpssScore>> {
  const scores = new Map<string, EpssScore>()

  for (const batch of chunk([...new Set(cves)], SECURITY_KEV.EPSS_BATCH_SIZE)) {
    const params = new URLSearchParams({ cve: batch.join(",") })
    const response = await fetchJson<EpssResponse>(`${EPSS_API_URL}?${params}`)

    response?.data?.forEach(({ cve, epss, percentile }) => {
      const score = toNumber(epss)
      const rank = toNumber(percentile)
      if (score !== null && rank !== null) scores.set(cve, { epss: score, percentile: rank })
    })
  }

  return scores
}
