"use client"

import { useEffect, useRef } from "react"

import { THEME } from "@/lib/constants/theme"
import {
  clampDemoHeight,
  DEMO_ACTION_ATTR,
  DEMO_BLOCK_ATTR,
  DEMO_HEIGHT_VARIABLE,
  DEMO_RERUN_ACTION,
  DEMO_STATE,
  DEMO_STATE_ATTR,
  parseDemoSource,
  type DemoConfig,
} from "@/lib/content/demo"
import {
  buildDemoDocument,
  DEMO_MESSAGE,
  DEMO_MESSAGE_SOURCE,
  type DemoTheme,
} from "@/lib/content/demo-document"

// 不支援此媒體查詢的舊瀏覽器沒有對應的互動版面，維持顯示程式碼區塊
const SCRIPTING_MEDIA_QUERY = "(scripting: enabled)"
const STAGE_SELECTOR = ".demo-block-stage"
const SOURCE_SELECTOR = ".demo-block-source pre"
// iframe 載入完成後仍未收到啟動訊息，代表腳本無法執行；訊息與 load 事件的先後不保證，需保留緩衝
const READY_GRACE_MS = 1500
// 不加 allow-same-origin：iframe 為不透明來源，無法存取部落格的 cookie、登入狀態與 DOM
const IFRAME_SANDBOX = "allow-scripts"

type Embed = {
  block: HTMLElement
  stage: HTMLElement
  config: DemoConfig
  iframe: HTMLIFrameElement | null
  isReady: boolean
  readyTimer: number | undefined
}

function readTheme(): DemoTheme {
  return document.documentElement.classList.contains(THEME.DARK) ? THEME.DARK : THEME.LIGHT
}

function postTheme(embed: Embed, theme: DemoTheme) {
  // 不透明來源的 iframe 無法指定 targetOrigin；訊息內容只有主題名稱
  embed.iframe?.contentWindow?.postMessage(
    { source: DEMO_MESSAGE_SOURCE, type: DEMO_MESSAGE.THEME, theme },
    "*",
  )
}

function stopEmbed(embed: Embed) {
  window.clearTimeout(embed.readyTimer)
  embed.iframe?.remove()
  embed.iframe = null
  embed.isReady = false
}

function failEmbed(embed: Embed) {
  stopEmbed(embed)
  embed.block.setAttribute(DEMO_STATE_ATTR, DEMO_STATE.FAILED)
}

// 重新執行時換一個全新的 iframe：Demo 的狀態完全歸零，也不會在瀏覽紀錄留下一筆導覽
function startEmbed(embed: Embed) {
  stopEmbed(embed)

  const iframe = document.createElement("iframe")
  iframe.title = embed.config.title
  iframe.setAttribute("sandbox", IFRAME_SANDBOX)
  iframe.srcdoc = buildDemoDocument(embed.config.body, readTheme())
  iframe.addEventListener("load", () => {
    if (embed.iframe !== iframe || embed.isReady) return
    embed.readyTimer = window.setTimeout(() => failEmbed(embed), READY_GRACE_MS)
  })

  embed.iframe = iframe
  embed.stage.append(iframe)
}

function createEmbed(block: HTMLElement): Embed | null {
  const stage = block.querySelector<HTMLElement>(STAGE_SELECTOR)
  const config = parseDemoSource(block.querySelector(SOURCE_SELECTOR)?.textContent ?? "")

  if (!stage || !config) {
    block.setAttribute(DEMO_STATE_ATTR, DEMO_STATE.FAILED)
    return null
  }

  block.setAttribute(DEMO_STATE_ATTR, DEMO_STATE.RUNNING)
  return { block, stage, config, iframe: null, isReady: false, readyTimer: undefined }
}

function handleMessage(embeds: Embed[], event: MessageEvent<unknown>) {
  // 以訊息來源的 window 物件比對，才能分辨是哪個 Demo 送來的；Demo 能偽造內容，因此高度仍需限制範圍
  const embed = embeds.find(({ iframe }) => iframe?.contentWindow === event.source)
  const data = event.data as { source?: unknown; type?: unknown; height?: unknown } | null
  if (!embed || data?.source !== DEMO_MESSAGE_SOURCE) return

  if (data.type === DEMO_MESSAGE.READY) {
    embed.isReady = true
    window.clearTimeout(embed.readyTimer)
    // iframe 建立後到啟動前主題可能已切換
    postTheme(embed, readTheme())
    return
  }

  if (data.type === DEMO_MESSAGE.HEIGHT && typeof data.height === "number") {
    embed.stage.style.setProperty(DEMO_HEIGHT_VARIABLE, `${clampDemoHeight(data.height)}px`)
  }
}

// 伺服器輸出 demo 區塊的外框與原始程式碼，這裡只負責建立 iframe，不會在 hydration 時改動伺服器 HTML。
// Next.js 會把造訪過的路由隱藏保留在 DOM 中，必須限定在自己所屬的 <article> 內，
// 隱藏時 effect 清理會移除 iframe，Demo 不會在背景繼續執行
export function DemoEmbeds() {
  const anchorRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const article = anchorRef.current?.closest("article")
    if (!article || !window.matchMedia(SCRIPTING_MEDIA_QUERY).matches) return

    const blocks = [...article.querySelectorAll<HTMLElement>(`[${DEMO_BLOCK_ATTR}]`)]
    if (blocks.length === 0) return

    const embeds = blocks.map(createEmbed).filter((embed) => embed !== null)
    const onMessage = (event: MessageEvent<unknown>) => handleMessage(embeds, event)

    const onClick = (event: Event) => {
      if (!(event.target instanceof Element)) return

      const button = event.target.closest(`[${DEMO_ACTION_ATTR}="${DEMO_RERUN_ACTION}"]`)
      const embed = embeds.find(({ block }) => button && block.contains(button))
      if (embed) startEmbed(embed)
    }

    // 直接觀察 <html> 的 class：next-themes 在子元件的 effect 之後才更新 class，以 hook 的值為準會讀到舊狀態
    const themeObserver = new MutationObserver(() => {
      const theme = readTheme()
      embeds.forEach((embed) => postTheme(embed, theme))
    })

    window.addEventListener("message", onMessage)
    article.addEventListener("click", onClick)
    themeObserver.observe(document.documentElement, { attributeFilter: ["class"] })
    embeds.forEach(startEmbed)

    return () => {
      window.removeEventListener("message", onMessage)
      article.removeEventListener("click", onClick)
      themeObserver.disconnect()
      embeds.forEach(stopEmbed)
      blocks.forEach((block) => block.removeAttribute(DEMO_STATE_ATTR))
    }
  }, [])

  return <span ref={anchorRef} hidden />
}
