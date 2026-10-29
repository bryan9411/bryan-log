import { Marked, type Token, type Tokens } from "marked"

import { HEADING_LEVELS } from "@/lib/editor/extensions"

const MIN_HEADING_LEVEL = HEADING_LEVELS[0]
const MAX_HEADING_LEVEL = HEADING_LEVELS[HEADING_LEVELS.length - 1]

// 整段被 ```markdown 包起來（常見於從 AI 對話複製）時，取出內層文字再轉換
const WRAPPING_FENCE = /^\s*(`{3,}|~{3,})\s*(?:markdown|md)\s*\n([\s\S]*?)\n\1\s*$/i

// 只要出現區塊層級的 Markdown 語法（標題、清單、引言、程式碼圍欄、分隔線）就視為 Markdown
const BLOCK_SYNTAX = /^(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s?|`{3,}|~{3,}|(?:-{3,}|\*{3,}|_{3,})\s*$)/m
const INLINE_SYNTAX = /\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^)\s]+\)/

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
}
const escapeHtml = (text: string) => text.replace(/[&<>"]/g, (char) => HTML_ESCAPES[char] ?? char)

const marked = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    // 預設輸出會在程式碼結尾多一個換行，編輯器會原樣保留，來回切換原始碼模式時空行會越積越多
    code({ text, lang }) {
      const language = lang?.trim().split(/\s+/)[0]
      const classAttribute = language ? ` class="language-${escapeHtml(language)}"` : ""
      return `<pre><code${classAttribute}>${escapeHtml(text.replace(/\n$/, ""))}</code></pre>\n`
    },
    // 圖片在編輯器中是區塊節點，單獨成段的圖片不包 <p>，避免解析後留下空段落
    paragraph({ tokens }) {
      const isImageOnly = tokens.every(
        (token) => token.type === "image" || (token.type === "text" && !token.raw.trim()),
      )
      const inner = this.parser.parseInline(tokens)
      return isImageOnly ? `${inner}\n` : `<p>${inner}</p>\n`
    },
  },
})

export function unwrapMarkdownFence(text: string) {
  return WRAPPING_FENCE.exec(text)?.[2] ?? text
}

export function looksLikeMarkdown(text: string) {
  return BLOCK_SYNTAX.test(text) || INLINE_SYNTAX.test(text)
}

function collectHeadings(tokens: Token[]) {
  const headings: Tokens.Heading[] = []
  marked.walkTokens(tokens, (token) => {
    if (token.type === "heading") headings.push(token as Tokens.Heading)
  })
  return headings
}

// 內文標題只允許 h2～h4（h1 保留給文章標題）；有 h1 時整體下移一級以保留原本的階層關係
function fitHeadingLevels(tokens: Token[]) {
  const headings = collectHeadings(tokens)
  const topLevel = Math.min(...headings.map((token) => token.depth))
  const shift = Math.max(0, MIN_HEADING_LEVEL - topLevel)

  for (const token of headings) {
    token.depth = Math.min(MAX_HEADING_LEVEL, token.depth + shift)
  }
}

// 轉為 HTML 後交給編輯器依 schema 解析，不支援的標籤（例如表格）會自動降級為段落文字
export function markdownToEditorHtml(markdown: string) {
  const tokens = marked.lexer(markdown)
  fitHeadingLevels(tokens)
  return marked.parser(tokens)
}
