import type { SearchEntry } from "@/lib/search/types"

export type HighlightRange = [start: number, end: number]

export type SearchResult = {
  entry: SearchEntry
  score: number
  // 標題中要標示的字元範圍（左閉右開）
  highlights: HighlightRange[]
}

const SCORE = {
  TITLE_SUBSTRING: 100,
  TITLE_PREFIX_BONUS: 20,
  TITLE_ACRONYM: 70,
  CATEGORY_SUBSTRING: 50,
  TITLE_SUBSEQUENCE: 20,
  CATEGORY_SUBSEQUENCE: 10,
} as const

const MAX_POSITION_PENALTY = 50

// 只做大小寫轉換，不使用 NFKC：須維持字串長度不變，標示範圍才能直接對應回原始標題
function normalize(value: string) {
  return value.toLowerCase()
}

// 依序找出每個字元的位置，例如「rsc」可比對「React Server Components」
function findSubsequence(text: string, token: string) {
  const positions: number[] = []
  let cursor = 0

  for (const char of token) {
    const index = text.indexOf(char, cursor)
    if (index === -1) return null
    positions.push(index)
    cursor = index + 1
  }

  return positions
}

const LATIN_WORD_PATTERN = /[a-z0-9]+/g

// 英文單字字首縮寫，例如「rls」對應 Row Level Security、「rsc」對應 React Server Components
function findAcronym(text: string, token: string) {
  const wordStarts = [...text.matchAll(LATIN_WORD_PATTERN)].map((match) => match.index)
  const initials = wordStarts.map((start) => text[start]).join("")
  const offset = initials.indexOf(token)

  if (offset === -1) return null
  return wordStarts.slice(offset, offset + token.length)
}

type TokenMatch = { score: number; highlights: HighlightRange[] }

// 字元越分散分數越低，但至少保留 1 分，排序仍會在所有精準命中之後
function scoreSubsequence(positions: number[], tokenLength: number, baseScore: number) {
  const spread = positions[positions.length - 1] - positions[0] - (tokenLength - 1)
  return Math.max(1, baseScore - spread)
}

// 優先順序：標題連續命中（越前面分數越高）＞英文字首縮寫＞分類命中＞標題逐字模糊命中＞分類逐字模糊命中
// 分類逐字比對讓中文簡稱也能命中，例如「資安」對應「資訊安全」、「前端」對應「前端開發」
function matchToken(title: string, category: string, token: string): TokenMatch | null {
  const titleIndex = title.indexOf(token)

  if (titleIndex !== -1) {
    const positionPenalty = Math.min(titleIndex, MAX_POSITION_PENALTY)
    const prefixBonus = titleIndex === 0 ? SCORE.TITLE_PREFIX_BONUS : 0

    return {
      score: SCORE.TITLE_SUBSTRING - positionPenalty + prefixBonus,
      highlights: [[titleIndex, titleIndex + token.length]],
    }
  }

  const acronymStarts = findAcronym(title, token)

  if (acronymStarts) {
    return {
      score: SCORE.TITLE_ACRONYM,
      highlights: acronymStarts.map((start): HighlightRange => [start, start + 1]),
    }
  }

  if (category.includes(token)) return { score: SCORE.CATEGORY_SUBSTRING, highlights: [] }

  const titlePositions = findSubsequence(title, token)

  if (titlePositions) {
    return {
      score: scoreSubsequence(titlePositions, token.length, SCORE.TITLE_SUBSEQUENCE),
      highlights: titlePositions.map((position): HighlightRange => [position, position + 1]),
    }
  }

  const categoryPositions = findSubsequence(category, token)
  if (!categoryPositions) return null

  return {
    score: scoreSubsequence(categoryPositions, token.length, SCORE.CATEGORY_SUBSEQUENCE),
    highlights: [],
  }
}

function mergeRanges(ranges: HighlightRange[]) {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0])

  return sorted.reduce<HighlightRange[]>((merged, range) => {
    const last = merged[merged.length - 1]
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1])
    else merged.push([range[0], range[1]])
    return merged
  }, [])
}

// 以空白分隔多個關鍵字，每個關鍵字都必須命中標題或分類；同分時維持原本的新到舊順序
export function searchEntries(entries: readonly SearchEntry[], query: string): SearchResult[] {
  const tokens = normalize(query).split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return []

  const results: SearchResult[] = []

  entries.forEach((entry) => {
    const title = normalize(entry.title)
    const category = normalize(`${entry.sectionName} ${entry.categoryPath ?? ""}`)
    let score = 0
    const highlights: HighlightRange[] = []

    for (const token of tokens) {
      const match = matchToken(title, category, token)
      if (!match) return

      score += match.score
      highlights.push(...match.highlights)
    }

    results.push({ entry, score, highlights: mergeRanges(highlights) })
  })

  return results.sort((a, b) => b.score - a.score)
}
