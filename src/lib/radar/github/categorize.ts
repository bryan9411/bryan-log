import {
  GITHUB_CATEGORIES,
  GITHUB_CATEGORY_RULES,
  GITHUB_LIST_PATTERNS,
  GITHUB_LIST_TOPICS,
  type GithubCategory,
} from "@/config/radar"
import { buildKeywordPattern } from "@/lib/radar/keywords"

export type CategorizeInput = {
  // owner/repo
  fullName: string
  description: string | null
  topics: string[]
}

export type CategorizeResult = {
  categories: GithubCategory[]
  isList: boolean
}

const KEYWORD_PATTERNS = Object.fromEntries(
  GITHUB_CATEGORIES.map((category) => [
    category,
    buildKeywordPattern(GITHUB_CATEGORY_RULES[category].keywords),
  ]),
) as Record<GithubCategory, RegExp>

// 純函式：只依 config/radar.ts 的規則判斷分類，第二期資安主題篩選沿用同一套作法
export function categorizeRepo({
  fullName,
  description,
  topics,
}: CategorizeInput): CategorizeResult {
  const repoName = fullName.split("/").pop() ?? fullName
  const normalizedTopics = new Set(topics.map((topic) => topic.toLowerCase()))
  const text = `${repoName} ${description ?? ""}`

  const categories = GITHUB_CATEGORIES.filter((category) => {
    const rule = GITHUB_CATEGORY_RULES[category]
    return (
      rule.topics.some((topic) => normalizedTopics.has(topic)) ||
      KEYWORD_PATTERNS[category].test(text)
    )
  })

  const isList =
    GITHUB_LIST_TOPICS.some((topic) => normalizedTopics.has(topic)) ||
    GITHUB_LIST_PATTERNS.some(
      (pattern) => pattern.test(repoName) || pattern.test(description ?? ""),
    )

  return { categories, isList }
}
