import "server-only"

import { GITHUB_NPM } from "@/config/radar"
import { daysAgoIso } from "@/lib/radar/dates"
import { fetchJson, mapWithConcurrency } from "@/lib/radar/http"
import { parseGithubRepoData } from "@/lib/radar/types"
import type { ServiceClient } from "@/lib/supabase/service"
import type { Json } from "@/types/database"

const CONCURRENCY = 5
// npm 套件名稱規則：可選的 @scope/，小寫英數與 - . _ ~
const NPM_PACKAGE_NAME = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/

type RankedRepo = {
  item_id: string
  title: string
  data: Json
}

type PackageJson = { name?: unknown; private?: unknown }
type RegistryManifest = { repository?: string | { url?: string } }
type DownloadsResponse = { downloads?: number }

function repositoryMatches(manifest: RegistryManifest, fullName: string) {
  const repository =
    typeof manifest.repository === "string" ? manifest.repository : manifest.repository?.url
  if (!repository) return false

  const normalized = repository.toLowerCase().replace(/\.git$/, "")
  const target = fullName.toLowerCase()
  return (
    normalized === target ||
    normalized === `github:${target}` ||
    normalized.endsWith(`github.com/${target}`)
  )
}

// 讀取根目錄 package.json 的 name，並確認 npm 上同名套件的 repository 指回這個 repo，
// 避免把同名但無關的套件（或 fork 沿用的名稱）的下載量算到這個 repo 頭上
async function resolvePackageName(fullName: string) {
  const packageJson = await fetchJson<PackageJson>(
    `https://raw.githubusercontent.com/${fullName}/HEAD/package.json`,
    { allowStatus: [404] },
  )
  const name = packageJson?.name
  if (typeof name !== "string" || packageJson?.private === true) return null
  if (!NPM_PACKAGE_NAME.test(name)) return null

  const manifest = await fetchJson<RegistryManifest>(`https://registry.npmjs.org/${name}/latest`, {
    allowStatus: [404],
  })
  return manifest && repositoryMatches(manifest, fullName) ? name : null
}

async function fetchWeeklyDownloads(name: string) {
  const response = await fetchJson<DownloadsResponse>(
    `https://api.npmjs.org/downloads/point/last-week/${name}`,
    { allowStatus: [404] },
  )
  return typeof response?.downloads === "number" ? response.downloads : null
}

// 只為今日前 N 名補上 npm 週下載量；套件名稱快取在 data.npm_package，查不到時隔 30 天再試
// 單一 repo 失敗只略過該筆，不影響整個同步
export async function enrichNpmDownloads(client: ServiceClient, ranked: RankedRepo[], now: number) {
  const recheckBefore = daysAgoIso(now, GITHUB_NPM.RECHECK_DAYS)
  const nowIso = new Date(now).toISOString()

  const results = await mapWithConcurrency(ranked, CONCURRENCY, async (repo) => {
    try {
      const data = parseGithubRepoData(repo.data)
      const shouldLookup =
        data.npm_package === undefined ||
        (data.npm_package === null && (data.npm_checked_at ?? "") < recheckBefore)

      const npmPackage = shouldLookup ? await resolvePackageName(repo.title) : data.npm_package
      const downloads = npmPackage ? await fetchWeeklyDownloads(npmPackage) : null

      const nextData = {
        ...(repo.data as Record<string, Json>),
        npm_package: npmPackage ?? null,
        npm_weekly_downloads: downloads,
        npm_checked_at: shouldLookup ? nowIso : (data.npm_checked_at ?? nowIso),
      }

      const { error } = await client
        .from("radar_items")
        .update({ data: nextData })
        .eq("id", repo.item_id)
      if (error) throw new Error(error.message)

      return downloads !== null
    } catch (error) {
      console.warn(`[radar] 查詢 ${repo.title} 的 npm 下載量失敗：`, error)
      return false
    }
  })

  return results.filter(Boolean).length
}
