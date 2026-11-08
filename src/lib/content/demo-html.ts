import { CODE_BLOCK_ICON_ATTRS, CODE_BLOCK_PATTERN } from "@/lib/content/code-block"
import {
  DEMO_ACTION_ATTR,
  DEMO_BLOCK_ATTR,
  DEMO_HEIGHT_ATTR,
  DEMO_HEIGHT_VARIABLE,
  DEMO_LAYOUT,
  DEMO_LAYOUT_ATTR,
  DEMO_RERUN_ACTION,
  parseDemoSource,
  type DemoConfig,
} from "@/lib/content/demo"
import { decodeHtmlEntities, escapeHtml } from "@/lib/content/html-entities"
import { CODE_LANGUAGE_CLASS_PREFIX } from "@/lib/editor/extensions"
import { DEMO_LANGUAGE } from "@/lib/editor/languages"

// 高亮階段不處理 demo 區塊，<pre> 內一定是未經 Shiki 改寫的 <code class="language-demo">
const DEMO_PRE_PREFIX = `<pre><code class="${CODE_LANGUAGE_CLASS_PREFIX}${DEMO_LANGUAGE}">`
const CODE_CLOSE_TAG = "</code></pre>"

// lucide 的 rotate-ccw 圖示
const RERUN_ICON = `<svg class="code-block-icon" ${CODE_BLOCK_ICON_ATTRS}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`

type ParsedBlock = {
  html: string
  start: number
  end: number
  isDemo: boolean
  config: DemoConfig | null
}

function parseBlock(match: RegExpExecArray): ParsedBlock {
  const [html, , pre] = match
  const isDemo = pre.startsWith(DEMO_PRE_PREFIX)

  return {
    html,
    start: match.index,
    end: match.index + html.length,
    isDemo,
    config: isDemo
      ? parseDemoSource(
          decodeHtmlEntities(pre.slice(DEMO_PRE_PREFIX.length, -CODE_CLOSE_TAG.length)),
        )
      : null,
  }
}

function renderDemo(config: DemoConfig, source: string, pairedCode: string | null) {
  const title = escapeHtml(config.title)
  const layout = pairedCode === null ? DEMO_LAYOUT.SINGLE : DEMO_LAYOUT.SPLIT
  const code = pairedCode === null ? "" : `<div class="demo-block-code">${pairedCode}</div>`

  return [
    `<div class="demo-block" ${DEMO_BLOCK_ATTR} ${DEMO_HEIGHT_ATTR}="${config.height}" ${DEMO_LAYOUT_ATTR}="${layout}">`,
    code,
    '<div class="demo-block-panel not-prose">',
    '<div class="demo-block-header">',
    `<span class="demo-block-title">${title}</span>`,
    `<button type="button" class="demo-block-rerun" ${DEMO_ACTION_ATTR}="${DEMO_RERUN_ACTION}" aria-label="重新執行 Demo：${title}">${RERUN_ICON}<span>重新執行</span></button>`,
    "</div>",
    `<div class="demo-block-stage" style="${DEMO_HEIGHT_VARIABLE}: ${config.height}px"></div>`,
    "</div>",
    `<div class="demo-block-source">${source}</div>`,
    "</div>",
  ].join("")
}

// 把合法的 demo 程式碼區塊包成互動區塊。原本的程式碼區塊完整保留在輸出中，
// 未啟用 JavaScript 或執行失敗時由 CSS 顯示回來；格式錯誤或沒有可配對的程式碼時則完全不改動。
// 輸入為高亮後的 HTML（需早於工具列步驟，此時每個區塊都只有單一 <pre>）；只有空白相隔才算緊鄰
export function wrapDemoBlocks(html: string) {
  const blocks = [...html.matchAll(CODE_BLOCK_PATTERN)].map(parseBlock)
  if (!blocks.some((block) => block.config)) return html

  let output = ""
  let cursor = 0

  blocks.forEach((block, index) => {
    const { config } = block
    if (!config) return

    const previous = blocks[index - 1]
    const canPair =
      previous !== undefined &&
      !previous.isDemo &&
      html.slice(previous.end, block.start).trim() === ""

    if (config.pairWithPrevious && !canPair) return

    const start = config.pairWithPrevious ? previous.start : block.start
    const pairedCode = config.pairWithPrevious ? previous.html : null

    output += html.slice(cursor, start) + renderDemo(config, block.html, pairedCode)
    cursor = block.end
  })

  return output + html.slice(cursor)
}
