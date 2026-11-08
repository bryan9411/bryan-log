// 清理後的 HTML 只會出現這些具名實體與數字實體（sanitize-html 只輸出 &amp; &lt; &gt; &quot;；
// 其餘為相容早期以 DOMPurify 存入資料庫的內容）
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
}

// 輸出到 HTML 內文或雙引號屬性值前使用
export function escapeHtml(text: string) {
  return text.replace(/[&<>"]/g, (char) => HTML_ESCAPES[char] ?? char)
}

export function decodeHtmlEntities(value: string) {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => {
    if (body.startsWith("#x") || body.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(body.slice(2), 16))
    }
    if (body.startsWith("#")) return String.fromCodePoint(Number.parseInt(body.slice(1), 10))
    return NAMED_ENTITIES[body.toLowerCase()] ?? entity
  })
}
