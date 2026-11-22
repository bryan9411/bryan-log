import { GITHUB_CATEGORIES, type GithubCategory } from "@/config/radar"
import { parseGithubRepoData, parseHnStoryData } from "@/lib/radar/types"
import type { Database } from "@/types/database"

type Functions = Database["public"]["Functions"]
type GithubRankingRow = Functions["radar_github_ranking"]["Returns"][number]
type HnRankingRow = Functions["radar_hn_ranking"]["Returns"][number]

// 前台與後台共用的榜單項目格式，資料皆來自排名函式
export type GithubRankingItem = {
  id: string
  fullName: string
  url: string
  description: string | null
  categories: GithubCategory[]
  language: string | null
  license: string | null
  weeklyStars: number
  totalStars: number
  npmPackage: string | null
  npmWeeklyDownloads: number | null
}

export type GithubRanking = {
  items: GithubRankingItem[]
  // 實際的統計天數，未滿 7 天代表快照仍在累積
  windowDays: number
  latestDate: string | null
}

export type HnRankingItem = {
  id: string
  title: string
  url: string
  hnUrl: string
  domain: string | null
  author: string | null
  points: number
  comments: number
  postedAt: string
}

const GITHUB_CATEGORY_SET = new Set<string>(GITHUB_CATEGORIES)

export function toGithubRankingItem(row: GithubRankingRow): GithubRankingItem {
  const data = parseGithubRepoData(row.data)

  return {
    id: row.item_id,
    fullName: row.title,
    url: row.url,
    description: row.summary,
    categories: row.categories.filter((category): category is GithubCategory =>
      GITHUB_CATEGORY_SET.has(category),
    ),
    language: data.language,
    license: data.license,
    weeklyStars: row.score,
    totalStars: row.total,
    npmPackage: data.npm_package ?? null,
    npmWeeklyDownloads: data.npm_weekly_downloads ?? null,
  }
}

export function toGithubRanking(rows: GithubRankingRow[]): GithubRanking {
  return {
    items: rows.map(toGithubRankingItem),
    windowDays: rows[0]?.window_days ?? 0,
    latestDate: rows[0]?.latest_date ?? null,
  }
}

export function toHnRankingItem(row: HnRankingRow): HnRankingItem {
  const data = parseHnStoryData(row.data)

  return {
    id: row.item_id,
    title: row.title,
    url: row.url,
    hnUrl: data.hn_url || row.url,
    domain: data.domain,
    author: data.author,
    points: row.score,
    comments: row.total,
    postedAt: data.posted_at,
  }
}
