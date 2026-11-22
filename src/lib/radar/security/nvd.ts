import "server-only"

import { SECURITY_NVD } from "@/config/radar"
import { getServerEnv } from "@/lib/env"
import { daysAgoIso } from "@/lib/radar/dates"
import { HttpError, fetchJson, sleep } from "@/lib/radar/http"

const NVD_API_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"

type CvssMetric = {
  type?: "Primary" | "Secondary"
  cvssData?: { baseScore?: number; version?: string }
}

type NvdResponse = {
  vulnerabilities?: Array<{
    cve?: {
      metrics?: Partial<
        Record<"cvssMetricV40" | "cvssMetricV31" | "cvssMetricV30" | "cvssMetricV2", CvssMetric[]>
      >
    }
  }>
}

export type CvssScore = { score: number; version: string }

export type CvssTarget = {
  cve: string
  cvss?: CvssScore | null
  cvssCheckedAt?: string | null
}

// 版本優先順序：最常見的 3.1 → 4.0 → 3.0 → 2；同一版本內優先採用 NVD 自己（Primary）的分數
const METRIC_KEYS = ["cvssMetricV31", "cvssMetricV40", "cvssMetricV30", "cvssMetricV2"] as const

function pickCvss(response: NvdResponse | null): CvssScore | null {
  const metrics = response?.vulnerabilities?.[0]?.cve?.metrics
  if (!metrics) return null

  for (const key of METRIC_KEYS) {
    const list = metrics[key] ?? []
    const metric = list.find((item) => item.type === "Primary") ?? list[0]
    const score = metric?.cvssData?.baseScore
    if (typeof score === "number") {
      return { score, version: metric?.cvssData?.version ?? key.replace("cvssMetricV", "") }
    }
  }

  return null
}

// 需要查詢：從沒查過，或上次 NVD 還沒有分數且已超過重查間隔
export function needsCvssLookup(target: CvssTarget, now: number) {
  if (target.cvss === undefined) return true
  if (target.cvss !== null) return false
  return (target.cvssCheckedAt ?? "") < daysAgoIso(now, SECURITY_NVD.RECHECK_DAYS)
}

// 只為還沒有 CVSS 的 CVE 查 NVD，呼叫端應先依加入日期由新到舊排序
// 無 key 每 30 秒只能 5 次：每次同步只查少量並間隔送出，首次上線補資料會分幾天完成
// NVD 是選用資料來源，任何錯誤都只略過，不影響整個同步
export async function fetchCvssScores(cves: string[]) {
  const apiKey = getServerEnv().NVD_API_KEY
  const limit = apiKey ? SECURITY_NVD.MAX_REQUESTS_WITH_KEY : SECURITY_NVD.MAX_REQUESTS_WITHOUT_KEY
  const delay = apiKey ? SECURITY_NVD.DELAY_WITH_KEY_MS : SECURITY_NVD.DELAY_WITHOUT_KEY_MS
  const headers: HeadersInit = apiKey ? { apiKey } : {}

  const results = new Map<string, CvssScore | null>()

  for (const [index, cve] of cves.slice(0, limit).entries()) {
    if (index > 0) await sleep(delay)

    try {
      const params = new URLSearchParams({ cveId: cve })
      const response = await fetchJson<NvdResponse>(`${NVD_API_URL}?${params}`, { headers })
      results.set(cve, pickCvss(response))
    } catch (error) {
      console.warn(`[radar] 查詢 ${cve} 的 CVSS 失敗：`, error)
      // 403／429 代表撞到速率上限，剩下的留到下次同步
      if (error instanceof HttpError && (error.status === 403 || error.status === 429)) break
    }
  }

  return results
}
