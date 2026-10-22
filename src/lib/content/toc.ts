import { decodeHtmlEntities } from "@/lib/content/html-entities"

export const TOC_LEVEL = {
  H2: 2,
  H3: 3,
} as const

export type TocLevel = (typeof TOC_LEVEL)[keyof typeof TOC_LEVEL]

// 放在共用模組而非 "use client" 檔案：伺服器元件從客戶端模組匯入的非元件值只會拿到參照代理，無法比對
export const TOC_VARIANT = {
  // 小螢幕：右下角懸浮按鈕，點擊後以底部抽屜展開
  DRAWER: "drawer",
  // 大螢幕：固定在右側欄
  SIDEBAR: "sidebar",
} as const

export type TocVariant = (typeof TOC_VARIANT)[keyof typeof TOC_VARIANT]

export type TocItem = {
  id: string
  text: string
  level: TocLevel
}

// 錨點加上前綴，避免與頁面既有的 id（例如 main-content）衝突或形成 DOM clobbering
const HEADING_ID_PREFIX = "section-"

// 輸入為 DOMPurify 清理後的 HTML：標題標籤一定成對且不含 id，可安全以正則比對
const HEADING_PATTERN = /<h([23])(\s[^>]*)?>([\s\S]*?)<\/h\1>/g
const TAG_PATTERN = /<[^>]+>/g

function toHeadingText(innerHtml: string) {
  return decodeHtmlEntities(innerHtml.replace(TAG_PATTERN, "")).replace(/\s+/g, " ").trim()
}

// 保留中文、英數，其餘轉為連字號，例如「第一道防線：伺服器端消毒」→ 第一道防線-伺服器端消毒
function toAnchorSlug(text: string) {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
}

function escapeAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")
}

// 為 h2、h3 加上錨點 id 並同時產生目錄；同名標題自動加上流水號確保 id 唯一
export function addHeadingAnchors(html: string) {
  const toc: TocItem[] = []
  const usedIds = new Map<string, number>()

  const anchoredHtml = html.replace(
    HEADING_PATTERN,
    (_match, level: string, attributes = "", innerHtml: string) => {
      const text = toHeadingText(innerHtml)
      const baseId = `${HEADING_ID_PREFIX}${toAnchorSlug(text) || toc.length + 1}`
      const duplicateCount = usedIds.get(baseId) ?? 0
      const id = duplicateCount === 0 ? baseId : `${baseId}-${duplicateCount + 1}`

      usedIds.set(baseId, duplicateCount + 1)
      toc.push({ id, text, level: Number(level) as TocLevel })

      return `<h${level}${attributes} id="${escapeAttribute(id)}">${innerHtml}</h${level}>`
    },
  )

  return { html: anchoredHtml, toc }
}
