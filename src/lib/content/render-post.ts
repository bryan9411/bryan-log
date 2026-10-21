import "server-only"

import { getSchema, type JSONContent } from "@tiptap/core"
import { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { renderToHTMLString } from "@tiptap/static-renderer/pm/html-string"

import { highlightCodeBlocks } from "@/lib/content/highlight-html"
import { estimateReadingMinutes } from "@/lib/content/reading-time"
import { sanitizeEditorHtml } from "@/lib/content/sanitize"
import { createContentExtensions } from "@/lib/editor/extensions"

const EXCERPT_LENGTH = 120
const ALLOWED_IMAGE_PROTOCOLS = ["https:", "http:"]
const CODE_BLOCK_NODE = "codeBlock"

const extensions = createContentExtensions()
const schema = getSchema(extensions)

export class ContentValidationError extends Error {}

export type RenderedPostContent = {
  json: JSONContent
  html: string
  plainText: string
  excerpt: string
  readingMinutes: number
}

function parseDocument(rawJson: unknown) {
  try {
    const doc = ProseMirrorNode.fromJSON(schema, rawJson)
    doc.check()
    return doc
  } catch {
    throw new ContentValidationError("文章內容格式不正確，請重新整理編輯器後再試")
  }
}

// 摘要只取標題與段落文字，程式碼區塊放進摘要既不易讀也不利於 SEO
function buildExcerpt(doc: ProseMirrorNode) {
  const parts: string[] = []

  doc.descendants((node) => {
    if (node.type.name === CODE_BLOCK_NODE) return false
    if (node.isTextblock) {
      parts.push(node.textContent)
      return false
    }
    return true
  })

  const singleLine = parts.join(" ").replace(/\s+/g, " ").trim()
  if (singleLine.length <= EXCERPT_LENGTH) return singleLine

  return `${singleLine.slice(0, EXCERPT_LENGTH)}…`
}

function assertSafeImages(doc: ProseMirrorNode) {
  doc.descendants((node) => {
    if (node.type.name !== "image") return

    const src: unknown = node.attrs.src

    try {
      if (typeof src === "string" && ALLOWED_IMAGE_PROTOCOLS.includes(new URL(src).protocol)) return
    } catch {
      // 無法解析的網址一律視為不合法
    }

    throw new ContentValidationError("文章中含有不合法的圖片網址")
  })
}

// 不信任瀏覽器送來的 HTML：以 schema 驗證 JSON 後，由伺服器自行產生 HTML，再經 DOMPurify 與 Shiki 處理
export async function renderPostContent(rawJson: unknown): Promise<RenderedPostContent> {
  const doc = parseDocument(rawJson)

  assertSafeImages(doc)

  const rawHtml = renderToHTMLString({ extensions, content: doc })
  const html = await highlightCodeBlocks(sanitizeEditorHtml(rawHtml))
  const plainText = doc.textBetween(0, doc.content.size, "\n", " ").trim()

  return {
    json: doc.toJSON(),
    html,
    plainText,
    excerpt: buildExcerpt(doc),
    readingMinutes: estimateReadingMinutes(plainText.length),
  }
}

// 摘要欄位留空時，存檔會寫入自動擷取的摘要；編輯時需辨認出這種情況並顯示為空白，
// 否則之後修改內文時摘要不會跟著更新，「留空即自動擷取」的行為也會失效
export function isAutoExcerpt(excerpt: string | null, rawJson: unknown) {
  if (!excerpt) return true

  try {
    return excerpt === buildExcerpt(parseDocument(rawJson))
  } catch {
    return false
  }
}
