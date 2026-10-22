import sanitizeHtml, { type IOptions, type Transformer } from "sanitize-html"

// 使用 sanitize-html（htmlparser2 純 JS 解析，不需 jsdom）：由 Turbopack 打包進伺服器程式碼，
// 不依賴執行環境是否支援 require(esm)，也免去 jsdom 數 MB 的冷啟動成本。
// 內文由伺服器從經 schema 驗證的編輯器 JSON 產生，這裡是縱深防禦的最後一道清理

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

// href 與 src 只允許這些協定（相對路徑不受影響），javascript:、data: 等一律移除
const ALLOWED_SCHEMES = ["http", "https", "mailto", "tel"]

// 屬性白名單套用到所有標籤，未列出的屬性（含 data-*）一律移除
const toOptions = (allowedTags: string[], allowedAttributes: string[]): IOptions => ({
  allowedTags,
  allowedAttributes: { "*": allowedAttributes },
  allowedSchemes: ALLOWED_SCHEMES,
  allowProtocolRelative: false,
})

const STYLE_ATTR = "style"

// style 只允許 Shiki 的 --shiki-* 自訂屬性，且值不得含括號，杜絕 url()、expression() 等 CSS 注入
const SHIKI_STYLE_PATTERN = /^(?:\s*--shiki-[a-z-]+\s*:\s*[#\w.% -]+;?)+\s*$/i

// transformTags 在屬性白名單過濾之前執行：不符合 Shiki 格式的 style 直接整個移除
const restrictStyleToShiki: Transformer = (tagName, attribs) => {
  const style = attribs[STYLE_ATTR]
  if (style === undefined || SHIKI_STYLE_PATTERN.test(style)) return { tagName, attribs }

  return {
    tagName,
    attribs: Object.fromEntries(Object.entries(attribs).filter(([name]) => name !== STYLE_ATTR)),
  }
}

const EDITOR_OPTIONS = toOptions(ALLOWED_TAGS, ALLOWED_ATTR)

const ARTICLE_OPTIONS: IOptions = {
  ...toOptions(ARTICLE_ALLOWED_TAGS, ARTICLE_ALLOWED_ATTR),
  transformTags: { "*": restrictStyleToShiki },
  // style 已由上方的 Shiki 規則把關；不再以 postcss 逐條解析，避免 --shiki-* 自訂屬性被當成未知屬性移除
  parseStyleAttributes: false,
}

export function sanitizeEditorHtml(html: string) {
  return sanitizeHtml(html, EDITOR_OPTIONS)
}

export function sanitizeArticleHtml(html: string) {
  return sanitizeHtml(html, ARTICLE_OPTIONS)
}
