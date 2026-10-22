import type { JSONContent } from "@tiptap/core"

// 將編輯器的 JSON 文件轉為 Markdown（CommonMark + GFM 刪除線）。
// 節點與標記對應 createContentExtensions 的 schema；未知節點只輸出其子內容，不會遺失文字

type Mark = NonNullable<JSONContent["marks"]>[number]

const BLOCK_SEPARATOR = "\n\n"

// 一般文字中具有 Markdown 語意的字元需轉義，避免匯出後格式跑掉
const INLINE_SPECIAL_PATTERN = /([\\`*_[\]<>~|])/g

const escapeText = (text: string) => text.replace(INLINE_SPECIAL_PATTERN, "\\$1")

// 行內程式碼與程式碼區塊的圍欄長度需大於內容中最長的連續反引號，才能正確包住內容
function fenceFor(code: string, minLength: number) {
  const longestRun = Math.max(0, ...(code.match(/`+/g) ?? []).map((run) => run.length))
  return "`".repeat(Math.max(minLength, longestRun + 1))
}

function wrapInlineCode(code: string) {
  const fence = fenceFor(code, 1)
  const padding = code.startsWith("`") || code.endsWith("`") ? " " : ""
  return `${fence}${padding}${code}${padding}${fence}`
}

// 括號與空白會提前結束 Markdown 連結目標，改以百分比編碼表示（encodeURIComponent 不會編碼括號）
const LINK_TARGET_ESCAPES: Record<string, string> = { "(": "%28", ")": "%29", " ": "%20" }
const escapeLinkTarget = (url: string) =>
  url.replace(/[() ]/g, (char) => LINK_TARGET_ESCAPES[char] ?? char)
const escapeTitle = (title: string) => title.replace(/"/g, '\\"')

function applyMark(text: string, mark: Mark) {
  switch (mark.type) {
    case "bold":
      return `**${text}**`
    case "italic":
      return `_${text}_`
    case "strike":
      return `~~${text}~~`
    case "underline":
      return `<u>${text}</u>`
    case "link": {
      const href = typeof mark.attrs?.href === "string" ? mark.attrs.href : ""
      return href ? `[${text}](${escapeLinkTarget(href)})` : text
    }
    default:
      return text
  }
}

function serializeText(node: JSONContent) {
  const raw = node.text ?? ""
  const marks = node.marks ?? []
  const isCode = marks.some((mark) => mark.type === "code")

  // 行內程式碼內不轉義；其餘標記由內而外包覆，連結放在最外層
  const base = isCode ? wrapInlineCode(raw) : escapeText(raw)
  const ordered = [...marks]
    .filter((mark) => mark.type !== "code")
    .sort((a, b) => Number(a.type === "link") - Number(b.type === "link"))

  return ordered.reduce(applyMark, base)
}

function serializeInline(nodes: JSONContent[] = []): string {
  return nodes
    .map((node): string => {
      if (node.type === "text") return serializeText(node)
      if (node.type === "hardBreak") return "\\\n"
      if (node.type === "image") return serializeImage(node)
      return serializeInline(node.content)
    })
    .join("")
}

function serializeImage(node: JSONContent) {
  const src = typeof node.attrs?.src === "string" ? node.attrs.src : ""
  if (!src) return ""

  const alt = typeof node.attrs?.alt === "string" ? escapeText(node.attrs.alt) : ""
  const title = typeof node.attrs?.title === "string" ? ` "${escapeTitle(node.attrs.title)}"` : ""
  return `![${alt}](${escapeLinkTarget(src)}${title})`
}

const indent = (text: string, prefix: string) =>
  text
    .split("\n")
    .map((line, index) => (index === 0 || line === "" ? line : `${prefix}${line}`))
    .join("\n")

const isList = (node: JSONContent) => node.type === "bulletList" || node.type === "orderedList"

// 清單項目內的巢狀清單緊接上一行，不插入空行，維持緊湊（tight）清單
function serializeListItem(nodes: JSONContent[] = []): string {
  return nodes
    .map((node, index) => {
      const block = serializeBlock(node)
      if (index === 0) return block
      return `${isList(node) ? "\n" : BLOCK_SEPARATOR}${block}`
    })
    .join("")
}

function serializeList(node: JSONContent, ordered: boolean) {
  const start = typeof node.attrs?.start === "number" ? node.attrs.start : 1

  return (node.content ?? [])
    .map((item, index) => {
      const marker = ordered ? `${start + index}. ` : "- "
      const body = serializeListItem(item.content).trim()
      return `${marker}${indent(body, " ".repeat(marker.length))}`
    })
    .join("\n")
}

function serializeBlock(node: JSONContent): string {
  switch (node.type) {
    case "paragraph":
      return serializeInline(node.content)
    case "heading": {
      const level = typeof node.attrs?.level === "number" ? node.attrs.level : 2
      return `${"#".repeat(level)} ${serializeInline(node.content)}`
    }
    case "bulletList":
      return serializeList(node, false)
    case "orderedList":
      return serializeList(node, true)
    case "blockquote":
      return serializeBlocks(node.content)
        .split("\n")
        .map((line) => (line ? `> ${line}` : ">"))
        .join("\n")
    case "codeBlock": {
      const code = (node.content ?? []).map((child) => child.text ?? "").join("")
      const language = typeof node.attrs?.language === "string" ? node.attrs.language : ""
      const fence = fenceFor(code, 3)
      return `${fence}${language}\n${code}\n${fence}`
    }
    case "horizontalRule":
      return "---"
    case "image":
      return serializeImage(node)
    default:
      return serializeBlocks(node.content)
  }
}

function serializeBlocks(nodes: JSONContent[] = []): string {
  return nodes
    .map(serializeBlock)
    .filter((block) => block.trim() !== "")
    .join(BLOCK_SEPARATOR)
}

export function tiptapJsonToMarkdown(doc: JSONContent) {
  const markdown = serializeBlocks(doc.content)
  return markdown ? `${markdown}\n` : ""
}

// 收集文件中所有圖片網址（依出現順序、去除重複），寫入 Frontmatter 方便日後搬移圖片
export function collectImageUrls(doc: JSONContent) {
  const urls = new Set<string>()

  const visit = (node: JSONContent) => {
    if (node.type === "image" && typeof node.attrs?.src === "string") urls.add(node.attrs.src)
    node.content?.forEach(visit)
  }

  visit(doc)
  return [...urls]
}
