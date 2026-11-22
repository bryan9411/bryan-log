import "server-only"

import { chunk, HttpError, mapWithConcurrency } from "@/lib/radar/http"
import { githubGraphql, normalizeLicense, type GithubRepo } from "@/lib/radar/github/client"

// GraphQL nodes 上限是 100 個 id，但每個 repo 還要帶 topics，100 個一批常超過 GitHub 約 10 秒的時限而回 502
const NODES_PER_QUERY = 50
// 逾時（5xx）時把該批對半拆開重試，拆到這個數量仍失敗才放棄
const MIN_NODES_PER_QUERY = 10
const RETRYABLE_STATUS = new Set([502, 503, 504])
// 同時送出的批次數；GitHub 建議避免大量併發，3 批可把約 1,000 個 repo 的更新時間縮短到三分之一
const CONCURRENT_QUERIES = 3
const MAX_TOPICS = 20

const REPOSITORY_NODES_QUERY = `
  query RadarRepositories($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Repository {
        id
        nameWithOwner
        url
        description
        stargazerCount
        forkCount
        isArchived
        isFork
        pushedAt
        createdAt
        primaryLanguage { name }
        licenseInfo { spdxId }
        repositoryTopics(first: ${MAX_TOPICS}) { nodes { topic { name } } }
      }
    }
  }
`

type RepositoryNode = {
  id: string
  nameWithOwner: string
  url: string
  description: string | null
  stargazerCount: number
  forkCount: number
  isArchived: boolean
  isFork: boolean
  pushedAt: string | null
  createdAt: string | null
  primaryLanguage: { name: string } | null
  licenseInfo: { spdxId: string | null } | null
  repositoryTopics: { nodes: Array<{ topic: { name: string } }> }
}

type NodesResponse = { nodes: Array<RepositoryNode | null> }

function toGithubRepo(node: RepositoryNode): GithubRepo {
  return {
    nodeId: node.id,
    fullName: node.nameWithOwner,
    url: node.url,
    description: node.description,
    language: node.primaryLanguage?.name ?? null,
    topics: node.repositoryTopics.nodes.map(({ topic }) => topic.name),
    license: normalizeLicense(node.licenseInfo?.spdxId),
    stars: node.stargazerCount,
    forks: node.forkCount,
    archived: node.isArchived,
    isFork: node.isFork,
    pushedAt: node.pushedAt,
    createdAt: node.createdAt,
  }
}

async function fetchNodes(token: string, ids: string[]): Promise<Array<RepositoryNode | null>> {
  try {
    const { nodes } = await githubGraphql<NodesResponse>(token, REPOSITORY_NODES_QUERY, { ids })
    return nodes
  } catch (error) {
    const isRetryable = error instanceof HttpError && RETRYABLE_STATUS.has(error.status)
    if (!isRetryable || ids.length <= MIN_NODES_PER_QUERY) throw error

    const middle = Math.ceil(ids.length / 2)
    const first = await fetchNodes(token, ids.slice(0, middle))
    const second = await fetchNodes(token, ids.slice(middle))
    return [...first, ...second]
  }
}

// 批次更新整個候選池的 star 數與 metadata；查無節點（repo 被刪除或轉為私有）的 id 放在 missing
export async function refreshGithubRepos(token: string, nodeIds: string[]) {
  const repos = new Map<string, GithubRepo>()
  const missing: string[] = []

  const batches = chunk(nodeIds, NODES_PER_QUERY)
  const results = await mapWithConcurrency(batches, CONCURRENT_QUERIES, (ids) =>
    fetchNodes(token, ids),
  )

  batches.forEach((ids, batchIndex) => {
    ids.forEach((id, index) => {
      const node = results[batchIndex][index]
      if (node?.id) repos.set(id, toGithubRepo(node))
      else missing.push(id)
    })
  })

  return { repos, missing }
}
