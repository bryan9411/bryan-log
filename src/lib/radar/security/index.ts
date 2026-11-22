import "server-only"

import { RADAR_MODULE, SECURITY_ADVISORY } from "@/config/radar"
import { getServerEnv } from "@/lib/env"
import { daysAgoIso } from "@/lib/radar/dates"
import { loadModuleItems, removeRadarItems, upsertRadarItems } from "@/lib/radar/items"
import { applyKeywordRules } from "@/lib/radar/keyword-rules"
import {
  fetchNpmMalwareAdvisories,
  fetchReviewedAdvisories,
  type NormalizedAdvisory,
} from "@/lib/radar/security/advisory"
import { categorizeSecurityItem, isInKev } from "@/lib/radar/security/enrich"
import {
  fetchEpssScores,
  fetchKevCatalog,
  isKnownRansomware,
  normalizeCwes,
  selectRecentKev,
  type EpssScore,
  type KevEntry,
} from "@/lib/radar/security/kev"
import {
  fetchNpmWeeklyDownloads,
  maxDownloads,
  passesMalwareThreshold,
  type NpmDownloads,
} from "@/lib/radar/security/malware-filter"
import { fetchCvssScores, needsCvssLookup } from "@/lib/radar/security/nvd"
import type { RadarSyncResult } from "@/lib/radar/sync-result"
import { parseAdvisoryData, parseKevData, type AdvisoryData, type KevData } from "@/lib/radar/types"
import type { ServiceClient } from "@/lib/supabase/service"
import type { Database } from "@/types/database"

type RadarItemInsert = Database["public"]["Tables"]["radar_items"]["Insert"]

const KEV_PREFIX = "kev:"
const GHSA_PREFIX = "ghsa:"

const kevExternalId = (cve: string) => `${KEV_PREFIX}${cve}`
const ghsaExternalId = (ghsa: string) => `${GHSA_PREFIX}${ghsa}`

type ExistingItem = { id: string; data: unknown }

function toKevRow(
  entry: KevEntry,
  epss: EpssScore | undefined,
  previous: KevData | null,
  nowIso: string,
): RadarItemInsert & { data: KevData } {
  const cve = entry.cveID
  const cwes = normalizeCwes(entry.cwes)
  const data: KevData = {
    source: "kev",
    cve,
    vendor: entry.vendorProject?.trim() || null,
    product: entry.product?.trim() || null,
    date_added: entry.dateAdded,
    due_date: entry.dueDate || null,
    ransomware: isKnownRansomware(entry),
    short_description: entry.shortDescription?.trim() || null,
    required_action: entry.requiredAction?.trim() || null,
    cwes,
    // EPSS 查詢失敗或還沒有分數時沿用上一次的值
    epss: epss?.epss ?? previous?.epss ?? null,
    epss_percentile: epss?.percentile ?? previous?.epss_percentile ?? null,
    // CVSS 由 NVD 補查，每天重寫 data 時保留
    cvss: previous?.cvss,
    cvss_checked_at: previous?.cvss_checked_at,
    watch_keywords: previous?.watch_keywords ?? [],
  }

  return {
    module_key: RADAR_MODULE.SECURITY,
    external_id: kevExternalId(cve),
    title: entry.vulnerabilityName?.trim() || cve,
    url: `https://nvd.nist.gov/vuln/detail/${cve}`,
    summary: [data.vendor, data.product].filter(Boolean).join(" ") || null,
    categories: categorizeSecurityItem({
      texts: [entry.vulnerabilityName, entry.shortDescription],
      vendor: data.vendor,
      product: data.product,
      cwes,
    }),
    data,
    last_seen_at: nowIso,
  }
}

function toAdvisoryRow(
  advisory: NormalizedAdvisory,
  kevCves: ReadonlySet<string>,
  downloads: {
    value: number | null | undefined
    checkedAt: string | null | undefined
    belowThreshold: boolean
  },
  previous: AdvisoryData | null,
  nowIso: string,
): RadarItemInsert & { data: AdvisoryData } {
  const data: AdvisoryData = {
    source: "advisory",
    ghsa: advisory.ghsa,
    cve: advisory.cve,
    type: advisory.type,
    severity: advisory.severity,
    ecosystem: advisory.ecosystem,
    package: advisory.package,
    vulnerable_range: advisory.vulnerableRange,
    patched_version: advisory.patchedVersion,
    cwes: advisory.cwes,
    epss: advisory.epss,
    epss_percentile: advisory.epssPercentile,
    npm_weekly_downloads: downloads.value,
    npm_checked_at: downloads.checkedAt,
    in_kev: isInKev(advisory.cve, kevCves),
    below_threshold: downloads.belowThreshold,
    published_at: advisory.publishedAt,
    watch_keywords: previous?.watch_keywords ?? [],
  }

  return {
    module_key: RADAR_MODULE.SECURITY,
    external_id: ghsaExternalId(advisory.ghsa),
    title: advisory.title,
    url: advisory.url,
    summary: `${advisory.ecosystem}/${advisory.package}`,
    categories: categorizeSecurityItem({
      texts: [advisory.title],
      packages: advisory.packages,
      ecosystem: advisory.ecosystem,
      advisoryType: advisory.type,
      cwes: advisory.cwes,
    }),
    data,
    last_seen_at: nowIso,
  }
}

// 實戰遭利用（KEV + EPSS，選用 NVD 補 CVSS）與開發生態漏洞（GitHub Advisory）一起同步，
// 寫入後套用排除／關注關鍵字並清除過期項目
export async function syncSecurity(client: ServiceClient, now: number): Promise<RadarSyncResult> {
  const { GITHUB_TOKEN } = getServerEnv()
  const nowIso = new Date(now).toISOString()

  const existingItems = await loadModuleItems(client, RADAR_MODULE.SECURITY)
  const existing = new Map<string, ExistingItem>(
    existingItems.map((item) => [item.external_id, { id: item.id, data: item.data }]),
  )
  const previousKev = (cve: string) => {
    const item = existing.get(kevExternalId(cve))
    return item ? parseKevData(item.data) : null
  }
  const previousAdvisory = (ghsa: string) => {
    const item = existing.get(ghsaExternalId(ghsa))
    return item ? parseAdvisoryData(item.data) : null
  }

  // --- 實戰遭利用 ---------------------------------------------------------------
  const catalog = await fetchKevCatalog()
  const kevCves = new Set(catalog.map((entry) => entry.cveID.toUpperCase()))
  const recentKev = selectRecentKev(catalog, now)
  const epssScores = await fetchEpssScores(recentKev.map((entry) => entry.cveID))

  const kevRows = recentKev.map((entry) =>
    toKevRow(entry, epssScores.get(entry.cveID), previousKev(entry.cveID), nowIso),
  )

  // 新加入的排前面，確保榜單期間內的 CVE 先補到分數
  const cvssTargets = kevRows
    .filter((row) =>
      needsCvssLookup(
        { cve: row.data.cve, cvss: row.data.cvss, cvssCheckedAt: row.data.cvss_checked_at },
        now,
      ),
    )
    .sort((a, b) => b.data.date_added.localeCompare(a.data.date_added))
  const cvssScores = await fetchCvssScores(cvssTargets.map((row) => row.data.cve))
  kevRows.forEach((row) => {
    if (!cvssScores.has(row.data.cve)) return
    row.data.cvss = cvssScores.get(row.data.cve) ?? null
    row.data.cvss_checked_at = nowIso
  })

  // --- 開發生態漏洞 ---------------------------------------------------------------
  const since = daysAgoIso(now, SECURITY_ADVISORY.WINDOW_DAYS)
  const [reviewed, malware] = await Promise.all([
    fetchReviewedAdvisories(GITHUB_TOKEN, since),
    fetchNpmMalwareAdvisories(GITHUB_TOKEN, since),
  ])
  const advisories = [...reviewed, ...malware]

  // npm 週下載量沿用 7 天內的查詢結果，因此惡意套件每天實際只需要查新增的公告；
  // 未達門檻的惡意套件也會寫入（below_threshold），作為查詢快取，但不列入榜單
  const cacheSince = daysAgoIso(now, SECURITY_ADVISORY.NPM_CACHE_DAYS)
  const needsLookup = (advisory: NormalizedAdvisory) => {
    if (advisory.ecosystem !== "npm") return false
    const previous = previousAdvisory(advisory.ghsa)
    return (
      previous?.npm_weekly_downloads === undefined || (previous.npm_checked_at ?? "") < cacheSince
    )
  }
  const lookupTargets = advisories.filter(needsLookup)
  const downloads: NpmDownloads = await fetchNpmWeeklyDownloads(
    // 已審核公告排前面：數量少、影響排序，時間不夠時優先查
    lookupTargets.flatMap((advisory) =>
      advisory.type === "malware" ? advisory.packages : [advisory.package],
    ),
    Date.now() + SECURITY_ADVISORY.NPM_LOOKUP_BUDGET_MS,
  )

  let lookupPending = 0
  const advisoryRows = advisories.map((advisory) => {
    const previous = previousAdvisory(advisory.ghsa)
    const isMalware = advisory.type === "malware"
    const names = isMalware ? advisory.packages : [advisory.package]
    const looked = needsLookup(advisory) && names.some((name) => downloads.has(name))
    if (needsLookup(advisory) && !looked) lookupPending++

    const value =
      advisory.ecosystem !== "npm"
        ? null
        : looked
          ? isMalware
            ? maxDownloads(names, downloads)
            : (downloads.get(advisory.package) ?? null)
          : previous?.npm_weekly_downloads

    return toAdvisoryRow(
      advisory,
      kevCves,
      {
        value,
        checkedAt: looked ? nowIso : previous?.npm_checked_at,
        // 還沒查到下載量的惡意套件先不上榜，下次同步補查
        belowThreshold: isMalware && !passesMalwareThreshold(value ?? null),
      },
      previous,
      nowIso,
    )
  })

  const rows = [...kevRows, ...advisoryRows]
  await upsertRadarItems(client, rows)

  // --- 保留期限 -----------------------------------------------------------------
  // KEV：不在近 60 天清單內的一律刪除（含 CISA 撤除的項目）；Advisory：發布超過 30 天刪除，
  // 未達門檻的惡意套件只是查詢快取，超過統計期間就刪除
  const currentKevIds = new Set(kevRows.map((row) => row.external_id))
  const advisoryExpiredBefore = daysAgoIso(now, SECURITY_ADVISORY.RETENTION_DAYS)
  const expiredIds = existingItems.flatMap((item) => {
    if (item.external_id.startsWith(KEV_PREFIX)) {
      return currentKevIds.has(item.external_id) ? [] : [item.id]
    }
    if (item.external_id.startsWith(GHSA_PREFIX)) {
      const data = parseAdvisoryData(item.data)
      const expiredBefore = data.below_threshold ? since : advisoryExpiredBefore
      return data.published_at && data.published_at < expiredBefore ? [item.id] : []
    }
    return []
  })
  const removed = await removeRadarItems(client, expiredIds)

  const rules = await applyKeywordRules(client, RADAR_MODULE.SECURITY, now)

  return {
    count: rows.length,
    details: {
      kev: kevRows.length,
      epss: epssScores.size,
      cvssLookups: cvssScores.size,
      reviewed: reviewed.length,
      malware: malware.length,
      malwareListed: advisoryRows.filter(
        (row) => row.data.type === "malware" && !row.data.below_threshold,
      ).length,
      npmLookups: downloads.size,
      npmLookupPending: lookupPending,
      removed,
      blockedByRule: rules.blocked,
      restoredByRule: rules.restored,
      watched: rules.watched,
    },
  }
}
