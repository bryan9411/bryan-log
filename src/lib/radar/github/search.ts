import "server-only"

import { GITHUB_CATEGORIES, GITHUB_CATEGORY_RULES, GITHUB_POOL } from "@/config/radar"
import { daysAgoDate } from "@/lib/radar/dates"
import { githubRest, normalizeLicense, type GithubRepo } from "@/lib/radar/github/client"

// Search API 每頁最多 100 筆
const SEARCH_PAGE_SIZE = 100

type SearchRepository = {
  node_id: string
  full_name: string
  html_url: string
  description: string | null
  language: string | null
  topics?: string[]
  license: { spdx_id: string | null } | null
  stargazers_count: number
  forks_count: number
  archived: boolean
  fork: boolean
  pushed_at: string | null
  created_at: string | null
}

type SearchResponse = { items: SearchRepository[] }

function toGithubRepo(item: SearchRepository): GithubRepo {
  return {
    nodeId: item.node_id,
    fullName: item.full_name,
    url: item.html_url,
    description: item.description,
    language: item.language,
    topics: item.topics ?? [],
    license: normalizeLicense(item.license?.spdx_id),
    stars: item.stargazers_count,
    forks: item.forks_count,
    archived: item.archived,
    isFork: item.fork,
    pushedAt: item.pushed_at,
    createdAt: item.created_at,
  }
}

async function searchRepositories(token: string, query: string, limit: number) {
  const repos: GithubRepo[] = []
  const pages = Math.ceil(limit / SEARCH_PAGE_SIZE)

  for (let page = 1; page <= pages; page++) {
    const params = new URLSearchParams({
      q: query,
      sort: "stars",
      order: "desc",
      per_page: String(SEARCH_PAGE_SIZE),
      page: String(page),
    })
    const response = await githubRest<SearchResponse>(token, `/search/repositories?${params}`)
    const items = response?.items ?? []

    repos.push(...items.map(toGithubRepo))
    if (items.length < SEARCH_PAGE_SIZE) break
  }

  return repos.slice(0, limit)
}

// 依序查詢「新秀」與各分類的 topic，約 15 次請求，低於 Search API 每分鐘 30 次的上限
// 回傳以 node id 去重後的候選 repo
export async function searchGithubCandidates(token: string, now: number) {
  const candidates = new Map<string, GithubRepo>()
  const addAll = (repos: GithubRepo[]) => repos.forEach((repo) => candidates.set(repo.nodeId, repo))

  const createdSince = daysAgoDate(now, GITHUB_POOL.NEWCOMER_CREATED_DAYS)
  addAll(
    await searchRepositories(
      token,
      `created:>${createdSince} stars:>=${GITHUB_POOL.NEWCOMER_MIN_STARS} fork:false archived:false`,
      GITHUB_POOL.NEWCOMER_LIMIT,
    ),
  )

  const pushedSince = daysAgoDate(now, GITHUB_POOL.TOPIC_PUSHED_DAYS)
  const topics = new Set(
    GITHUB_CATEGORIES.flatMap((key) => GITHUB_CATEGORY_RULES[key].searchTopics),
  )

  for (const topic of topics) {
    addAll(
      await searchRepositories(
        token,
        `topic:${topic} pushed:>${pushedSince} stars:>=${GITHUB_POOL.TOPIC_MIN_STARS} fork:false archived:false`,
        GITHUB_POOL.TOPIC_LIMIT,
      ),
    )
  }

  return candidates
}
