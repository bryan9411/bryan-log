import DOMPurify, { type UponSanitizeAttributeHook } from "isomorphic-dompurify"

// 白名單僅包含編輯器 schema 會產生的標籤與屬性，其餘一律移除
const ALLOWED_TAGS = [
  "p",
  "h2",
  "h3",
  "h4",
  "strong",
  "em",
  "s",
  "u",
  "code",
  "pre",
  "blockquote",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "hr",
  "br",
]

const ALLOWED_ATTR = ["href", "target", "rel", "src", "alt", "title", "class", "start"]

// 前台輸出時另需保留 Shiki 預先高亮產生的外層容器、色彩 span 與語言標記
const ARTICLE_ALLOWED_TAGS = [...ALLOWED_TAGS, "div", "span"]
const ARTICLE_ALLOWED_ATTR = [
  ...ALLOWED_ATTR,
  "style",
  "tabindex",
  "data-language",
  "data-language-label",
]

const STYLE_ATTR = "style"

// style 只允許 Shiki 的 --shiki-* 自訂屬性，且值不得含括號，杜絕 url()、expression() 等 CSS 注入
const SHIKI_STYLE_PATTERN = /^(?:\s*--shiki-[a-z-]+\s*:\s*[#\w.% -]+;?)+\s*$/i

const restrictStyleToShiki: UponSanitizeAttributeHook = (_node, data) => {
  if (data.attrName === STYLE_ATTR && !SHIKI_STYLE_PATTERN.test(data.attrValue)) {
    data.keepAttr = false
  }
}

export function sanitizeEditorHtml(html: string) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  })
}

// DOMPurify 的 hook 為全域設定，僅在本次清理期間掛上並立即移除；sanitize 為同步執行，不會影響其他呼叫
export function sanitizeArticleHtml(html: string) {
  DOMPurify.addHook("uponSanitizeAttribute", restrictStyleToShiki)

  try {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ARTICLE_ALLOWED_TAGS,
      ALLOWED_ATTR: ARTICLE_ALLOWED_ATTR,
      ALLOW_DATA_ATTR: false,
    })
  } finally {
    DOMPurify.removeHook("uponSanitizeAttribute", restrictStyleToShiki)
  }
}
