import DOMPurify from "isomorphic-dompurify"

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

export function sanitizeEditorHtml(html: string) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  })
}
