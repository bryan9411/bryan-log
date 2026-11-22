import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import {
  RADAR_KEYWORD_RULE_KIND,
  type RadarKeywordRuleKind,
  type RadarModuleKey,
} from "@/config/radar"
import { mapWithConcurrency } from "@/lib/radar/http"
import { matchesKeyword } from "@/lib/radar/keywords"
import type { Database, Json } from "@/types/database"

// 排程（service role）與後台 Server Action（管理員登入）都會呼叫，兩種 client 皆可
type RadarClient = SupabaseClient<Database>

const PAGE_SIZE = 1000
const UPDATE_CONCURRENCY = 8

export type RadarKeywordRule = {
  id: string
  kind: RadarKeywordRuleKind
  keyword: string
  createdAt: string
}

type RuleTargetItem = {
  id: string
  title: string
  summary: string | null
  data: Json
  is_blocked: boolean
  blocked_at: string | null
  blocked_rule_id: string | null
}

// data 內參與比對的欄位：涵蓋各模組的套件、廠商／產品、摘要與編號；不存在的欄位自動略過
const SEARCHABLE_DATA_FIELDS = [
  "vendor",
  "product",
  "package",
  "ecosystem",
  "short_description",
  "cve",
  "ghsa",
  "domain",
  "language",
  "topics",
] as const

function asRecord(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {}
}

export function buildKeywordSearchText(item: Pick<RuleTargetItem, "title" | "summary" | "data">) {
  const data = asRecord(item.data)
  const fields = SEARCHABLE_DATA_FIELDS.flatMap((field) => {
    const value = data[field]
    if (typeof value === "string") return [value]
    if (Array.isArray(value)) return value.filter((entry) => typeof entry === "string")
    return []
  })
  return [item.title, item.summary ?? "", ...fields].join(" \n ")
}

export function toExcludeReason(keyword: string) {
  return `排除關鍵字：${keyword}`
}

export async function listKeywordRules(
  client: RadarClient,
  moduleKey: RadarModuleKey,
): Promise<RadarKeywordRule[]> {
  const { data, error } = await client
    .from("radar_keyword_rules")
    .select("id, kind, keyword, created_at")
    .eq("module_key", moduleKey)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })

  if (error) throw new Error(`讀取關鍵字規則失敗：${error.message}`)

  return data.map((row) => ({
    id: row.id,
    kind: row.kind,
    keyword: row.keyword,
    createdAt: row.created_at,
  }))
}

async function loadRuleTargets(client: RadarClient, moduleKey: RadarModuleKey) {
  const items: RuleTargetItem[] = []

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from("radar_items")
      .select("id, title, summary, data, is_blocked, blocked_at, blocked_rule_id")
      .eq("module_key", moduleKey)
      .order("id")
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw new Error(`讀取雷達項目失敗：${error.message}`)

    // 未達門檻的惡意套件只是下載量查詢快取，不會上榜，規則與預覽都不計入
    items.push(...data.filter((item) => asRecord(item.data).below_threshold !== true))
    if (data.length < PAGE_SIZE) return items
  }
}

// 預覽用：目前有幾筆項目會被這個關鍵字命中（含已隱藏的項目），不寫入任何資料
export async function countKeywordMatches(
  client: RadarClient,
  moduleKey: RadarModuleKey,
  keyword: string,
) {
  const items = await loadRuleTargets(client, moduleKey)
  return items.filter((item) => matchesKeyword(buildKeywordSearchText(item), keyword)).length
}

function sameKeywords(a: Json | undefined, b: string[]) {
  const current = Array.isArray(a) ? a.filter((value) => typeof value === "string") : []
  return current.length === b.length && current.every((value, index) => value === b[index])
}

export type ApplyKeywordRulesResult = {
  blocked: number
  restored: number
  watched: number
}

// 依目前的規則重新計算每個項目：
// - exclude：命中就自動隱藏並記錄原因；因規則被隱藏、但已不再命中任何規則（規則被刪除）的項目自動還原
// - watch：命中的關鍵字寫進 data.watch_keywords，前後台顯示「關注」徽章，不影響名次
// - 手動隱藏的項目（blocked_rule_id 為 null）不受排除規則影響
// 同步寫入資料後、新增或刪除規則後都會呼叫，結果與規則的新增順序無關（同時命中多條排除規則時記錄最早的一條）
export async function applyKeywordRules(
  client: RadarClient,
  moduleKey: RadarModuleKey,
  now = Date.now(),
): Promise<ApplyKeywordRulesResult> {
  const [rules, items] = await Promise.all([
    listKeywordRules(client, moduleKey),
    loadRuleTargets(client, moduleKey),
  ])
  const excludeRules = rules.filter((rule) => rule.kind === RADAR_KEYWORD_RULE_KIND.EXCLUDE)
  const watchRules = rules.filter((rule) => rule.kind === RADAR_KEYWORD_RULE_KIND.WATCH)
  const nowIso = new Date(now).toISOString()
  const result: ApplyKeywordRulesResult = { blocked: 0, restored: 0, watched: 0 }

  const updates = items.flatMap((item) => {
    const text = buildKeywordSearchText(item)
    const data = asRecord(item.data)
    const watchKeywords = watchRules
      .filter((rule) => matchesKeyword(text, rule.keyword))
      .map((rule) => rule.keyword)
      .sort()
    if (watchKeywords.length > 0) result.watched++

    const update: Database["public"]["Tables"]["radar_items"]["Update"] = {}

    if (!sameKeywords(data.watch_keywords, watchKeywords)) {
      const nextData = { ...data }
      delete nextData.watch_keywords
      if (watchKeywords.length > 0) nextData.watch_keywords = watchKeywords
      update.data = nextData
    }

    const isManuallyBlocked = item.is_blocked && !item.blocked_rule_id
    if (!isManuallyBlocked) {
      const excludeRule = excludeRules.find((rule) => matchesKeyword(text, rule.keyword))
      if (excludeRule && item.blocked_rule_id !== excludeRule.id) {
        Object.assign(update, {
          is_blocked: true,
          blocked_at: item.is_blocked ? item.blocked_at : nowIso,
          blocked_reason: toExcludeReason(excludeRule.keyword),
          blocked_rule_id: excludeRule.id,
        })
        if (!item.is_blocked) result.blocked++
      } else if (!excludeRule && item.blocked_rule_id) {
        Object.assign(update, {
          is_blocked: false,
          blocked_at: null,
          blocked_reason: null,
          blocked_rule_id: null,
        })
        result.restored++
      }
    }

    return Object.keys(update).length > 0 ? [{ id: item.id, update }] : []
  })

  await mapWithConcurrency(updates, UPDATE_CONCURRENCY, async ({ id, update }) => {
    const { error } = await client.from("radar_items").update(update).eq("id", id)
    if (error) throw new Error(`套用關鍵字規則失敗：${error.message}`)
  })

  return result
}
