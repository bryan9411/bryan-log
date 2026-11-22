import { SECURITY_TOPIC_RULES, SECURITY_TOPICS, type SecurityTopic } from "@/config/radar"
import { buildKeywordPattern } from "@/lib/radar/keywords"

export type SecurityTopicInput = {
  // 漏洞名稱或公告標題、官方摘要
  texts: Array<string | null | undefined>
  // KEV 的廠商與產品
  vendor?: string | null
  product?: string | null
  // GitHub Advisory 的套件名稱與生態系
  packages?: string[]
  ecosystem?: string | null
  advisoryType?: string | null
  cwes: string[]
}

const KEYWORD_PATTERNS = Object.fromEntries(
  SECURITY_TOPICS.map((topic) => [
    topic,
    buildKeywordPattern(SECURITY_TOPIC_RULES[topic].keywords),
  ]),
) as Record<SecurityTopic, RegExp>

function matchesPackage(name: string, patterns: string[]) {
  const lower = name.toLowerCase()
  return patterns.some((pattern) =>
    pattern.endsWith("/") ? lower.startsWith(pattern) : lower === pattern,
  )
}

// 純函式：只依 config/radar.ts 的規則判斷主題，做法與第一期 GitHub 的 categorizeRepo 相同
// 一筆漏洞可以同時屬於多個主題；主題只用來篩選，不影響名次
export function categorizeSecurityItem(input: SecurityTopicInput): SecurityTopic[] {
  const packages = input.packages ?? []
  const text = [...input.texts, input.vendor, input.product, ...packages]
    .filter(Boolean)
    .join(" \n ")
  const cwes = new Set(input.cwes)

  return SECURITY_TOPICS.filter((topic) => {
    const rule = SECURITY_TOPIC_RULES[topic]
    return (
      KEYWORD_PATTERNS[topic].test(text) ||
      packages.some((name) => matchesPackage(name, rule.packages)) ||
      rule.cwes.some((cwe) => cwes.has(cwe)) ||
      (input.ecosystem ? rule.ecosystems.includes(input.ecosystem) : false) ||
      (input.advisoryType ? rule.advisoryTypes.includes(input.advisoryType) : false)
    )
  })
}

// 用 CVE 編號比對 GitHub Advisory 是否也出現在 KEV（整份目錄，不限近 30 天）
export function isInKev(cve: string | null, kevCves: ReadonlySet<string>) {
  return cve ? kevCves.has(cve.toUpperCase()) : false
}
