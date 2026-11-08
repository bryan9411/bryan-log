// 互動 Demo 的共用定義：伺服器端用來決定如何輸出，瀏覽器端用來取出要執行的內容，
// 兩邊以同一份規則解析，不會出現伺服器判定合法、瀏覽器卻解析失敗的情況

export const DEMO_BLOCK_ATTR = "data-demo-block"
export const DEMO_HEIGHT_ATTR = "data-demo-height"
export const DEMO_LAYOUT_ATTR = "data-demo-layout"
export const DEMO_STATE_ATTR = "data-demo-state"
export const DEMO_ACTION_ATTR = "data-demo-action"
export const DEMO_RERUN_ACTION = "rerun"
export const DEMO_HEIGHT_VARIABLE = "--demo-height"

export const DEMO_LAYOUT = {
  SINGLE: "single",
  SPLIT: "split",
} as const

export const DEMO_STATE = {
  RUNNING: "running",
  FAILED: "failed",
} as const

const DEFAULT_DEMO_HEIGHT = 240
// 內容以 100vh 撐高時，高度會隨 iframe 變高而無限增加；到達上限後改在 iframe 內捲動
const MIN_DEMO_HEIGHT = 40
const MAX_DEMO_HEIGHT = 1600

export function clampDemoHeight(height: number) {
  return Math.min(MAX_DEMO_HEIGHT, Math.max(MIN_DEMO_HEIGHT, Math.ceil(height)))
}

export type DemoConfig = {
  title: string
  height: number
  pairWithPrevious: boolean
  // 去除第一行設定註解後，實際要執行的 HTML 片段
  body: string
}

// 第一行必須是 <!-- demo ... -->，整個註解限制在同一行
const HEADER_PATTERN = /^\s*<!--[ \t]*demo\b([^\n]*?)-->[ \t]*(?:\r?\n|$)/
const ATTRIBUTE_PATTERN = /([\w-]+)="([^"]*)"/g
const HEIGHT_PATTERN = /^[1-9]\d*$/
const KNOWN_ATTRIBUTES = new Set(["title", "height", "code"])
const CODE_PREVIOUS = "previous"

// 回傳 null 代表格式錯誤，由呼叫端退回顯示原本的程式碼區塊
export function parseDemoSource(source: string): DemoConfig | null {
  const header = HEADER_PATTERN.exec(source)
  if (!header) return null

  // 設定註解除了 key="value" 之外不能有其他內容，打錯引號或屬性名稱時才會被視為格式錯誤
  if (header[1].replace(ATTRIBUTE_PATTERN, "").trim() !== "") return null

  const attributes = new Map([...header[1].matchAll(ATTRIBUTE_PATTERN)].map(([, k, v]) => [k, v]))
  if ([...attributes.keys()].some((name) => !KNOWN_ATTRIBUTES.has(name))) return null

  const title = attributes.get("title")?.trim()
  if (!title) return null

  const height = attributes.get("height")
  if (height !== undefined && !HEIGHT_PATTERN.test(height)) return null

  const code = attributes.get("code")
  if (code !== undefined && code !== CODE_PREVIOUS) return null

  const body = source.slice(header[0].length)
  if (body.trim() === "") return null

  return {
    title,
    height: clampDemoHeight(height === undefined ? DEFAULT_DEMO_HEIGHT : Number(height)),
    pairWithPrevious: code === CODE_PREVIOUS,
    body,
  }
}
