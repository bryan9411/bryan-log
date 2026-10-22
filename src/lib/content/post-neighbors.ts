import type { PostSummary } from "@/lib/data/public-posts"

export type AdjacentPosts = {
  // 時間較早的一篇
  previous: PostSummary | null
  // 時間較新的一篇
  next: PostSummary | null
}

// posts 需依發布時間由新到舊排序（與 getPublishedPosts 一致）
export function findAdjacentPosts(posts: readonly PostSummary[], slug: string): AdjacentPosts {
  const index = posts.findIndex((post) => post.slug === slug)
  if (index === -1) return { previous: null, next: null }

  return {
    previous: posts[index + 1] ?? null,
    next: posts[index - 1] ?? null,
  }
}

const SCORE = {
  SAME_CATEGORY: 6,
  SAME_PARENT_CATEGORY: 3,
  SHARED_LATIN_KEYWORD: 2,
  SHARED_CJK_KEYWORD: 1,
} as const

const RELATED_POSTS_MAX = 3
const RELATED_POSTS_MIN = 2

// 英文關鍵字（技術名詞如 React、Supabase、RLS）辨識度高；中文以相鄰兩字為單位比對標題用詞
const LATIN_WORD_PATTERN = /[a-z][a-z0-9.+#-]+/g
const CJK_RUN_PATTERN = /[\p{Script=Han}]+/gu
const MIN_LATIN_WORD_LENGTH = 2

// 出現在大多數技術文章標題中的詞，對判斷相關性沒有幫助
const STOP_WORDS = new Set(["the", "and", "for", "with", "how", "to", "in", "of", "vs"])
const CJK_STOP_WORDS = new Set(["完全", "指南", "實作", "入門", "如何", "使用", "一次", "搞懂"])

function extractKeywords(post: PostSummary) {
  const text = `${post.title} ${post.excerpt ?? ""}`.toLowerCase()

  const latin = new Set(
    (text.match(LATIN_WORD_PATTERN) ?? []).filter(
      (word) => word.length >= MIN_LATIN_WORD_LENGTH && !STOP_WORDS.has(word),
    ),
  )

  // 中文只取標題：摘要的雙字組合過多，容易產生雜訊
  const cjk = new Set<string>()
  ;(post.title.match(CJK_RUN_PATTERN) ?? []).forEach((run) => {
    for (let index = 0; index < run.length - 1; index += 1) {
      const bigram = run.slice(index, index + 2)
      if (!CJK_STOP_WORDS.has(bigram)) cjk.add(bigram)
    }
  })

  return { latin, cjk }
}

const countShared = (source: Set<string>, target: Set<string>) =>
  [...source].filter((keyword) => target.has(keyword)).length

function scoreCategory(source: PostSummary, candidate: PostSummary) {
  if (source.category && source.category.slug === candidate.category?.slug) {
    return SCORE.SAME_CATEGORY
  }

  // 同一主分類：比對雙方的主分類（無父分類時，分類本身即為主分類）
  const sourceRoot = source.parentCategory?.slug ?? source.category?.slug
  const candidateRoot = candidate.parentCategory?.slug ?? candidate.category?.slug
  return sourceRoot && sourceRoot === candidateRoot ? SCORE.SAME_PARENT_CATEGORY : 0
}

// 相關文章：同分類加權最高，其次為同主分類與共同關鍵字；同分時以較新的文章優先。
// 有分數的文章不足兩篇時，以最新文章補足，確保文末至少有延伸閱讀
export function findRelatedPosts(posts: readonly PostSummary[], slug: string) {
  const source = posts.find((post) => post.slug === slug)
  if (!source) return []

  const sourceKeywords = extractKeywords(source)
  const candidates = posts.filter((post) => post.slug !== slug)

  const scored = candidates
    .map((post, recency) => {
      const keywords = extractKeywords(post)
      const score =
        scoreCategory(source, post) +
        countShared(sourceKeywords.latin, keywords.latin) * SCORE.SHARED_LATIN_KEYWORD +
        countShared(sourceKeywords.cjk, keywords.cjk) * SCORE.SHARED_CJK_KEYWORD

      return { post, score, recency }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.recency - b.recency)
    .slice(0, RELATED_POSTS_MAX)
    .map(({ post }) => post)

  if (scored.length >= RELATED_POSTS_MIN) return scored

  const fillers = candidates.filter((post) => !scored.includes(post))
  return [...scored, ...fillers].slice(0, RELATED_POSTS_MIN)
}
