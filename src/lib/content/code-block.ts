import {
  getCodeLanguageLabel,
  getCodeLanguageShortLabel,
  normalizeCodeLanguage,
} from "@/lib/editor/languages"

// 前台程式碼區塊的互動以事件委派處理：伺服器輸出按鈕，瀏覽器端只掛一個點擊監聽
export const CODE_BLOCK_ACTION_ATTR = "data-code-action"
export const CODE_BLOCK_LINE_NUMBERS_ATTR = "data-line-numbers"
export const CODE_BLOCK_COPIED_ATTR = "data-copied"

export const CODE_BLOCK_ACTION = {
  COPY: "copy",
  TOGGLE_LINE_NUMBERS: "toggle-line-numbers",
} as const

export type CodeBlockAction = (typeof CODE_BLOCK_ACTION)[keyof typeof CODE_BLOCK_ACTION]

// 達到此行數的程式碼預設顯示行號；較短的片段預設隱藏，仍可手動切換
const LINE_NUMBERS_DEFAULT_MIN_LINES = 8

// 輸入為 sanitizeArticleHtml 清理後的 HTML：.code-block 容器由存檔時的高亮流程產生，
// 內含單一 <pre>，程式碼內容已轉義，不可能出現未轉義的 </pre>，因此可安全以正則比對
const CODE_BLOCK_PATTERN = /<div class="code-block"([^>]*)>(<pre[\s\S]*?<\/pre>)<\/div>/g
const LANGUAGE_ATTR_PATTERN = /data-language="([\w-]+)"/
const SHIKI_LINE_PATTERN = /<span class="line">/g

// lucide 圖示（copy、check、list-ordered），以字串輸出避免在伺服器端渲染 React 元件
const ICON_ATTRS =
  'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"'

const ICON = {
  COPY: `<svg class="code-block-icon code-block-icon-copy" ${ICON_ATTRS}><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
  CHECK: `<svg class="code-block-icon code-block-icon-check" ${ICON_ATTRS}><path d="M20 6 9 17l-5-5"/></svg>`,
  LINE_NUMBERS: `<svg class="code-block-icon" ${ICON_ATTRS}><path d="M10 12h11"/><path d="M10 18h11"/><path d="M10 6h11"/><path d="M4 10h2"/><path d="M4 6h1v4"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>`,
} as const

function renderButton(action: CodeBlockAction, label: string, content: string, extra = "") {
  return `<button type="button" class="code-block-button" ${CODE_BLOCK_ACTION_ATTR}="${action}" aria-label="${label}" title="${label}"${extra}>${content}</button>`
}

// 為每個程式碼區塊加上頂部工具列：語言標籤、行號切換與一鍵複製
// 只有 Shiki 高亮過的區塊（以 .line 逐行包裝）才能顯示行號；純文字區塊僅提供複製
export function addCodeBlockToolbar(html: string) {
  return html.replace(CODE_BLOCK_PATTERN, (_match, attributes: string, pre: string) => {
    const language = normalizeCodeLanguage(attributes.match(LANGUAGE_ATTR_PATTERN)?.[1])
    const lineCount = pre.match(SHIKI_LINE_PATTERN)?.length ?? 0
    const supportsLineNumbers = lineCount > 0
    const showLineNumbers = lineCount >= LINE_NUMBERS_DEFAULT_MIN_LINES

    const lineNumbersButton = supportsLineNumbers
      ? renderButton(
          CODE_BLOCK_ACTION.TOGGLE_LINE_NUMBERS,
          "切換行號",
          ICON.LINE_NUMBERS,
          ` aria-pressed="${showLineNumbers}"`,
        )
      : ""

    const toolbar = [
      '<div class="code-block-toolbar">',
      `<span class="code-block-language" title="${getCodeLanguageLabel(language)}">${getCodeLanguageShortLabel(language)}</span>`,
      '<div class="code-block-actions">',
      lineNumbersButton,
      renderButton(CODE_BLOCK_ACTION.COPY, "複製程式碼", `${ICON.COPY}${ICON.CHECK}`),
      "</div>",
      "</div>",
    ].join("")

    // 行號寬度依總行數的位數決定，避免三位數行號時欄寬跳動
    const lineNumberAttrs = showLineNumbers ? ` ${CODE_BLOCK_LINE_NUMBERS_ATTR}` : ""
    const digitsStyle = supportsLineNumbers
      ? ` style="--code-line-digits: ${String(lineCount).length}"`
      : ""

    return `<div class="code-block"${attributes}${lineNumberAttrs}${digitsStyle}>${toolbar}${pre}</div>`
  })
}
