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

const stringArray = z.array(z.string()).catch([]).default([])

// CVSS 分數：KEV 由 NVD 補查（undefined 代表還沒查過、null 代表 NVD 尚未提供分數）
const cvssSchema = z.object({ score: z.number(), version: z.string() }).nullable().catch(null)

export const kevDataSchema = z.object({
  source: z.literal("kev").catch("kev"),
  cve: z.string().catch("").default(""),
  vendor: nullableString.default(null),
  product: nullableString.default(null),
  date_added: z.string().catch("").default(""),
  due_date: nullableString.default(null),
  // CISA 的值為 Known 或 Unknown
  ransomware: z.boolean().catch(false).default(false),
  short_description: nullableString.default(null),
  required_action: nullableString.default(null),
  cwes: stringArray,
  epss: nullableNumber.default(null),
  epss_percentile: nullableNumber.default(null),
  cvss: cvssSchema.optional(),
  cvss_checked_at: nullableString.optional(),
  watch_keywords: stringArray,
})

export type KevData = z.infer<typeof kevDataSchema>

export const advisoryDataSchema = z.object({
  source: z.literal("advisory").catch("advisory"),
  ghsa: z.string().catch("").default(""),
  cve: nullableString.default(null),
  type: z.enum(["reviewed", "malware"]).catch("reviewed"),
  severity: z.string().catch("").default(""),
  ecosystem: z.string().catch("").default(""),
  package: z.string().catch("").default(""),
  vulnerable_range: nullableString.default(null),
  patched_version: nullableString.default(null),
  cwes: stringArray,
  epss: nullableNumber.default(null),
  epss_percentile: nullableNumber.default(null),
  // 只有 npm 套件會查詢；undefined 代表還沒查過
  npm_weekly_downloads: nullableNumber.optional(),
  npm_checked_at: nullableString.optional(),
  in_kev: z.boolean().catch(false).default(false),
  // 惡意套件週下載量未達門檻（或還沒查到）：資料保留作為查詢快取，但不列入榜單
  below_threshold: z.boolean().catch(false).default(false),
  published_at: z.string().catch("").default(""),
  watch_keywords: stringArray,
})

export type AdvisoryData = z.infer<typeof advisoryDataSchema>

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {}
}

export function parseGithubRepoData(value: unknown): GithubRepoData {
  return githubRepoDataSchema.parse(asObject(value))
}

export function parseHnStoryData(value: unknown): HnStoryData {
  return hnStoryDataSchema.parse(asObject(value))
}

export function parseKevData(value: unknown): KevData {
  return kevDataSchema.parse(asObject(value))
}

export function parseAdvisoryData(value: unknown): AdvisoryData {
  return advisoryDataSchema.parse(asObject(value))
}
