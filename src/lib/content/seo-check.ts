import type { JSONContent } from "@tiptap/core"

import { SLUG_PATTERN } from "@/lib/content/slug"

export const SEO_CHECK_STATUS = {
  PASS: "pass",
  WARN: "warn",
  FAIL: "fail",
} as const

export type SeoCheckStatus = (typeof SEO_CHECK_STATUS)[keyof typeof SEO_CHECK_STATUS]

export const SEO_CHECK_STATUS_LABEL: Record<SeoCheckStatus, string> = {
  [SEO_CHECK_STATUS.PASS]: "通過",
  [SEO_CHECK_STATUS.WARN]: "建議改善",
  [SEO_CHECK_STATUS.FAIL]: "需修正",
}

export type SeoCheck = {
  id: string
  label: string
  status: SeoCheckStatus
  message: string
}

export type SeoCheckInput = {
  title: string
  slug: string
  excerpt: string
  content: JSONContent | null
  coverImageUrl: string | null
}

// 搜尋結果以像素寬度截斷：中日韓全形字約為半形英數的兩倍寬，以「顯示寬度」計算比字數更準確
// 標題約 60 單位（約 30 個中文字）、描述約 160 單位（約 80 個中文字）內可完整顯示
const TITLE_WIDTH = { MIN: 20, MAX: 60 } as const
const EXCERPT_WIDTH = { MIN: 60, MAX: 160 } as const
const SLUG_RECOMMENDED_MAX_LENGTH = 60
// 內文超過此字數仍沒有小標時，建議加入 H2 分段
const LONG_CONTENT_WITHOUT_HEADINGS = 600

const WIDE_CHAR_PATTERN = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/u

function displayWidth(text: string) {
  return [...text].reduce((width, char) => width + (WIDE_CHAR_PATTERN.test(char) ? 2 : 1), 0)
}

const formatWidth = (width: number) => `約 ${Math.ceil(width / 2)} 個中文字寬`

function checkTitle(title: string): SeoCheck {
  const base = { id: "title", label: "標題長度" }
  const trimmed = title.trim()
  const width = displayWidth(trimmed)

  if (!trimmed) return { ...base, status: SEO_CHECK_STATUS.FAIL, message: "尚未輸入標題" }
  if (width < TITLE_WIDTH.MIN) {
    return {
      ...base,
      status: SEO_CHECK_STATUS.WARN,
      message: `偏短（${formatWidth(width)}），建議加入關鍵字讓主題更明確`,
    }
  }
  if (width > TITLE_WIDTH.MAX) {
    return {
      ...base,
      status: SEO_CHECK_STATUS.WARN,
      message: `偏長（${formatWidth(width)}），搜尋結果可能被截斷，建議 30 字內`,
    }
  }
  return { ...base, status: SEO_CHECK_STATUS.PASS, message: `長度適中（${formatWidth(width)}）` }
}

function checkSlug(slug: string): SeoCheck {
  const base = { id: "slug", label: "網址代稱" }

  if (!slug) return { ...base, status: SEO_CHECK_STATUS.FAIL, message: "尚未輸入網址代稱" }
  if (!SLUG_PATTERN.test(slug)) {
    return {
      ...base,
      status: SEO_CHECK_STATUS.FAIL,
      message: "僅能使用小寫英文、數字與連字號，且不可以連字號開頭或結尾",
    }
  }
  if (slug.length > SLUG_RECOMMENDED_MAX_LENGTH) {
    return {
      ...base,
      status: SEO_CHECK_STATUS.WARN,
      message: `共 ${slug.length} 字，建議精簡到 ${SLUG_RECOMMENDED_MAX_LENGTH} 字內`,
    }
  }
  return { ...base, status: SEO_CHECK_STATUS.PASS, message: "格式正確、簡潔易讀" }
}

function checkExcerpt(excerpt: string): SeoCheck {
  const base = { id: "excerpt", label: "摘要完整度" }
  const width = displayWidth(excerpt.trim())

  if (width === 0) {
    return {
      ...base,
      status: SEO_CHECK_STATUS.WARN,
      message: "未填寫，將自動擷取內文開頭；手寫摘要通常更能吸引點擊",
    }
  }
  if (width < EXCERPT_WIDTH.MIN) {
    return {
      ...base,
      status: SEO_CHECK_STATUS.WARN,
      message: `偏短（${formatWidth(width)}），建議 30～80 字說明文章重點`,
    }
  }
  if (width > EXCERPT_WIDTH.MAX) {
    return {
      ...base,
      status: SEO_CHECK_STATUS.WARN,
      message: `偏長（${formatWidth(width)}），搜尋結果約只顯示前 80 字`,
    }
  }
  return { ...base, status: SEO_CHECK_STATUS.PASS, message: `長度適中（${formatWidth(width)}）` }
}

type ContentOutline = {
  headingLevels: number[]
  textLength: number
}

function outlineContent(content: JSONContent | null): ContentOutline {
  const outline: ContentOutline = { headingLevels: [], textLength: 0 }

  const visit = (node: JSONContent) => {
    if (node.type === "heading" && typeof node.attrs?.level === "number") {
      outline.headingLevels.push(node.attrs.level)
    }
    if (node.type === "text") outline.textLength += node.text?.length ?? 0
    node.content?.forEach(visit)
  }

  if (content) visit(content)
  return outline
}

// 文章標題已是頁面唯一的 H1；內文應從 H2 開始，且不跳級（例如 H2 後直接接 H4）
function checkHeadings(content: JSONContent | null): SeoCheck {
  const base = { id: "headings", label: "內文標題階層" }
  const { headingLevels, textLength } = outlineContent(content)

  if (headingLevels.includes(1)) {
    return {
      ...base,
      status: SEO_CHECK_STATUS.FAIL,
      message: "內文含有 H1，頁面只應有文章標題一個 H1",
    }
  }

  if (headingLevels.length === 0) {
    if (textLength === 0) {
      return { ...base, status: SEO_CHECK_STATUS.WARN, message: "尚未撰寫內文" }
    }
    if (textLength > LONG_CONTENT_WITHOUT_HEADINGS) {
      return {
        ...base,
        status: SEO_CHECK_STATUS.WARN,
        message: "長文建議以 H2 小標分段，方便讀者瀏覽與產生目錄",
      }
    }
    return { ...base, status: SEO_CHECK_STATUS.PASS, message: "短文，可不使用小標" }
  }

  if (headingLevels[0] !== 2) {
    return {
      ...base,
      status: SEO_CHECK_STATUS.WARN,
      message: `第一個小標為 H${headingLevels[0]}，建議從 H2 開始`,
    }
  }

  const skipIndex = headingLevels.findIndex(
    (level, index) => index > 0 && level > headingLevels[index - 1] + 1,
  )
  if (skipIndex !== -1) {
    return {
      ...base,
      status: SEO_CHECK_STATUS.WARN,
      message: `H${headingLevels[skipIndex - 1]} 後直接接 H${headingLevels[skipIndex]}，建議不要跳級`,
    }
  }

  const h2Count = headingLevels.filter((level) => level === 2).length
  return {
    ...base,
    status: SEO_CHECK_STATUS.PASS,
    message: `共 ${headingLevels.length} 個小標（${h2Count} 個 H2），階層正確`,
  }
}

function checkCover(coverImageUrl: string | null): SeoCheck {
  const base = { id: "cover", label: "封面圖片" }

  if (!coverImageUrl) {
    return {
      ...base,
      status: SEO_CHECK_STATUS.WARN,
      message: "未設定；社群分享會使用自動產生的分享圖，列表與內頁則不顯示封面",
    }
  }
  return { ...base, status: SEO_CHECK_STATUS.PASS, message: "已設定封面圖片" }
}

export function runSeoChecks(input: SeoCheckInput): SeoCheck[] {
  return [
    checkTitle(input.title),
    checkSlug(input.slug),
    checkExcerpt(input.excerpt),
    checkHeadings(input.content),
    checkCover(input.coverImageUrl),
  ]
}
