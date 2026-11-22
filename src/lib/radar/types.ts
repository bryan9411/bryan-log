import { z } from "zod"

// radar_items.data 的模組專屬欄位；資料由排程寫入，讀取時仍以 zod 驗證並補上預設值，
// 避免舊資料缺欄位或格式變動時讓前台整頁出錯

const nullableString = z.string().nullable().catch(null)
const nullableNumber = z.number().nullable().catch(null)

export const githubRepoDataSchema = z.object({
  language: nullableString.default(null),
  topics: z.array(z.string()).catch([]).default([]),
  license: nullableString.default(null),
  stars: z.number().catch(0).default(0),
  forks: z.number().catch(0).default(0),
  archived: z.boolean().catch(false).default(false),
  is_fork: z.boolean().catch(false).default(false),
  is_list: z.boolean().catch(false).default(false),
  pushed_at: nullableString.default(null),
  repo_created_at: nullableString.default(null),
  // undefined 代表還沒查過；null 代表查過但不是 npm 套件
  npm_package: nullableString.optional(),
  npm_weekly_downloads: nullableNumber.optional(),
  npm_checked_at: nullableString.optional(),
  last_search_hit_at: nullableString.optional(),
})

export type GithubRepoData = z.infer<typeof githubRepoDataSchema>

export const hnStoryDataSchema = z.object({
  points: z.number().catch(0).default(0),
  num_comments: z.number().catch(0).default(0),
  author: nullableString.default(null),
  hn_url: z.string().catch("").default(""),
  domain: nullableString.default(null),
  is_show_hn: z.boolean().catch(false).default(false),
  posted_at: z.string().catch("").default(""),
})

export type HnStoryData = z.infer<typeof hnStoryDataSchema>

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {}
}

export function parseGithubRepoData(value: unknown): GithubRepoData {
  return githubRepoDataSchema.parse(asObject(value))
}

export function parseHnStoryData(value: unknown): HnStoryData {
  return hnStoryDataSchema.parse(asObject(value))
}
