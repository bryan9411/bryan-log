import "server-only"

import { SECURITY_ADVISORY } from "@/config/radar"
import { githubRest, githubRestPage } from "@/lib/radar/github/client"
import { normalizeCwes } from "@/lib/radar/security/kev"

const PER_PAGE = 100
// 惡意套件公告一週可能超過 500 筆，設上限避免異常時無止盡翻頁
const MAX_PAGES = 20

// 欄位已實際呼叫 GET /advisories 確認
export type GithubAdvisory = {
  ghsa_id: string
  cve_id: string | null
  html_url: string
  summary: string | null
  type: "reviewed" | "malware" | "unreviewed"
  severity: string | null
  published_at: string
  withdrawn_at?: string | null
  vulnerabilities?: Array<{
    package?: { ecosystem?: string; name?: string } | null
    vulnerable_version_range?: string | null
    first_patched_version?: string | null
  }> | null
  cwes?: Array<{ cwe_id: string; name?: string }> | null
  epss?: { percentage?: number | null; percentile?: number | null } | null
}

// 寫入資料庫前整理過的公告：只保留榜單需要的欄位
export type NormalizedAdvisory = {
  ghsa: string
  cve: string | null
  url: string
  title: string
  type: "reviewed" | "malware"
  severity: string
  ecosystem: string
  package: string
  // 同一公告列出的所有同生態系套件（惡意套件以其中下載量最高者為準）
  packages: string[]
  vulnerableRange: string | null
  patchedVersion: string | null
  cwes: string[]
  epss: number | null
  epssPercentile: number | null
  publishedAt: string
}

type AdvisoryQuery = {
  type: "reviewed" | "malware"
  ecosystem: string
  severity?: string
  // ISO 時間，只取這之後發布的公告
  since: string
}

async function listAdvisories(token: string, query: AdvisoryQuery) {
  const params = new URLSearchParams({
    type: query.type,
    ecosystem: query.ecosystem,
    published: `>=${query.since.slice(0, 19)}Z`,
    per_page: String(PER_PAGE),
    sort: "published",
    direction: "desc",
  })
  if (query.severity) params.set("severity", query.severity)

  const advisories: GithubAdvisory[] = []
  let next: string | null = `/advisories?${params}`

  for (let page = 0; next && page < MAX_PAGES; page++) {
    const response: { data: GithubAdvisory[] | null; next: string | null } = await githubRestPage<
      GithubAdvisory[]
    >(token, next)
    advisories.push(...(response.data ?? []))
    next = response.next
  }

  return advisories
}

const MAX_RANGE_LENGTH = 200

// 已撤回、未審核或不含指定生態系套件的公告回傳 null
export function normalizeAdvisory(
  advisory: GithubAdvisory,
  ecosystem: string,
): NormalizedAdvisory | null {
  if (advisory.withdrawn_at) return null
  if (advisory.type !== "reviewed" && advisory.type !== "malware") return null

  const vulnerabilities = (advisory.vulnerabilities ?? []).filter(
    (item) => item.package?.ecosystem === ecosystem && item.package.name,
  )
  if (vulnerabilities.length === 0) return null

  const packages = [...new Set(vulnerabilities.map((item) => item.package!.name!))]
  const primary = packages[0]
  const primaryEntries = vulnerabilities.filter((item) => item.package!.name === primary)
  const ranges = primaryEntries
    .map((item) => item.vulnerable_version_range?.trim())
    .filter((range): range is string => Boolean(range))
  const patched = primaryEntries.find((item) => item.first_patched_version)?.first_patched_version

  return {
    ghsa: advisory.ghsa_id,
    cve: advisory.cve_id,
    url: advisory.html_url,
    title: advisory.summary?.trim() || advisory.ghsa_id,
    type: advisory.type,
    severity: advisory.type === "malware" ? "malware" : (advisory.severity ?? "").toLowerCase(),
    ecosystem,
    package: primary,
    packages,
    vulnerableRange: ranges.length ? ranges.join(", ").slice(0, MAX_RANGE_LENGTH) : null,
    patchedVersion: patched ?? null,
    cwes: normalizeCwes(advisory.cwes?.map((cwe) => cwe.cwe_id)),
    epss: advisory.epss?.percentage ?? null,
    epssPercentile: advisory.epss?.percentile ?? null,
    publishedAt: advisory.published_at,
  }
}

// 已審核公告：每個生態系 × 每個等級各查一次（5 × 2 = 10 次請求，資料量通常一頁就夠）
// 同一公告可能同時影響多個生態系，以 GHSA 編號去重，保留第一次出現的生態系
export async function fetchReviewedAdvisories(token: string, since: string) {
  const queries = SECURITY_ADVISORY.ECOSYSTEMS.flatMap((ecosystem) =>
    SECURITY_ADVISORY.SEVERITIES.map((severity) => ({ ecosystem, severity })),
  )

  const results = await Promise.all(
    queries.map(async ({ ecosystem, severity }) => {
      const advisories = await listAdvisories(token, {
        type: "reviewed",
        ecosystem,
        severity,
        since,
      })
      return advisories.map((advisory) => normalizeAdvisory(advisory, ecosystem))
    }),
  )

  const byGhsa = new Map<string, NormalizedAdvisory>()
  results.flat().forEach((advisory) => {
    if (advisory && !byGhsa.has(advisory.ghsa)) byGhsa.set(advisory.ghsa, advisory)
  })
  return [...byGhsa.values()]
}

// npm 惡意套件公告（一週可能超過 500 筆，絕大多數是零下載的仿冒套件，交由 malware-filter 過濾）
export async function fetchNpmMalwareAdvisories(token: string, since: string) {
  const advisories = await listAdvisories(token, { type: "malware", ecosystem: "npm", since })
  return advisories
    .map((advisory) => normalizeAdvisory(advisory, "npm"))
    .filter((advisory): advisory is NormalizedAdvisory => advisory !== null)
}

// 單筆查詢（收藏每日更新用）；公告不存在時 GitHub 回 404，回傳 null
export function fetchAdvisory(token: string, ghsa: string) {
  return githubRest<GithubAdvisory>(token, `/advisories/${encodeURIComponent(ghsa)}`, {
    allowStatus: [404],
  })
}
