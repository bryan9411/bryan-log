import "server-only"

import { fetchJson, fetchJsonResponse } from "@/lib/radar/http"

const GITHUB_API = "https://api.github.com"
const GITHUB_API_VERSION = "2022-11-28"

// 搜尋結果與 GraphQL 回傳格式不同，統一轉成這個結構再寫入資料庫
export type GithubRepo = {
  nodeId: string
  fullName: string
  url: string
  description: string | null
  language: string | null
  topics: string[]
  license: string | null
  stars: number
  forks: number
  archived: boolean
  isFork: boolean
  pushedAt: string | null
  createdAt: string | null
}

function githubHeaders(token: string) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
    "User-Agent": "radar-sync",
  }
}

// allowStatus：例如單筆查詢公告時，404 代表公告已不存在，回傳 null 交由呼叫端處理
export function githubRest<T>(
  token: string,
  path: string,
  options: { allowStatus?: number[] } = {},
) {
  return fetchJson<T>(`${GITHUB_API}${path}`, { headers: githubHeaders(token), ...options })
}

// 分頁查詢：回傳 Link 標頭中的下一頁網址（GitHub Advisory API 以 after 游標分頁）
// 只接受 api.github.com 的完整網址，避免把 token 送到其他主機
export async function githubRestPage<T>(token: string, pathOrUrl: string) {
  const url = pathOrUrl.startsWith(`${GITHUB_API}/`) ? pathOrUrl : `${GITHUB_API}${pathOrUrl}`
  const { data, headers } = await fetchJsonResponse<T>(url, { headers: githubHeaders(token) })
  const next = /<([^>]+)>;\s*rel="next"/.exec(headers.get("link") ?? "")?.[1] ?? null
  return { data, next }
}

type GraphqlResponse<T> = {
  data?: T
  errors?: Array<{ type?: string; message: string }>
}

// GraphQL 查無節點時會在 errors 回報 NOT_FOUND、對應的節點為 null，這種情況交由呼叫端處理
export async function githubGraphql<T>(token: string, query: string, variables: object) {
  const response = await fetchJson<GraphqlResponse<T>>(`${GITHUB_API}/graphql`, {
    method: "POST",
    headers: { ...githubHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  })

  const fatalErrors = (response?.errors ?? []).filter((error) => error.type !== "NOT_FOUND")
  if (fatalErrors.length > 0 || !response?.data) {
    const message = fatalErrors.map((error) => error.message).join("；") || "沒有回傳資料"
    throw new Error(`GitHub GraphQL 錯誤：${message}`)
  }

  return response.data
}

// GitHub 對未知授權回傳 NOASSERTION，顯示成「其他」比較好懂
export function normalizeLicense(spdxId: string | null | undefined) {
  if (!spdxId) return null
  return spdxId === "NOASSERTION" ? "Other" : spdxId
}
