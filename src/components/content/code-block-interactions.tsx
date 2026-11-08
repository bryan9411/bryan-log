"use client"

import dynamic from "next/dynamic"
import { useEffect } from "react"

import {
  CODE_BLOCK_ACTION,
  CODE_BLOCK_ACTION_ATTR,
  CODE_BLOCK_COLLAPSED_ATTR,
  CODE_BLOCK_COPIED_ATTR,
  CODE_BLOCK_FOLD_LABEL,
  CODE_BLOCK_LINE_NUMBERS_ATTR,
} from "@/lib/content/code-block"

// Toast 只有複製程式碼時會用到，不放進首屏載入的程式
const LazyToaster = dynamic(
  () => import("@/components/ui/sonner").then((module) => module.Toaster),
  {
    ssr: false,
  },
)
const loadToast = () => import("@/components/ui/sonner").then((module) => module.toast)

const COPIED_RESET_MS = 2000
const CODE_BLOCK_SELECTOR = ".code-block"
const ACTION_SELECTOR = `[${CODE_BLOCK_ACTION_ATTR}]`
const FOLD_LABEL_SELECTOR = ".code-block-fold-label"
// 收合時若區塊頂端已捲出視窗，捲回區塊開頭，讀者才不會停在一片空白處；保留頁首高度的空間
const STICKY_HEADER_OFFSET = 80

function toggleLineNumbers(block: HTMLElement, button: HTMLElement) {
  const isVisible = block.toggleAttribute(CODE_BLOCK_LINE_NUMBERS_ATTR)
  button.setAttribute("aria-pressed", String(isVisible))
}

function toggleCollapse(block: HTMLElement, button: HTMLElement) {
  const isCollapsed = block.toggleAttribute(CODE_BLOCK_COLLAPSED_ATTR)
  const lineCount = Number(button.dataset.lineCount)

  button.setAttribute("aria-expanded", String(!isCollapsed))
  const label = button.querySelector(FOLD_LABEL_SELECTOR)
  if (label) {
    label.textContent = isCollapsed
      ? CODE_BLOCK_FOLD_LABEL.expand(lineCount)
      : CODE_BLOCK_FOLD_LABEL.collapse
  }

  if (isCollapsed && block.getBoundingClientRect().top < STICKY_HEADER_OFFSET) {
    window.scrollBy({ top: block.getBoundingClientRect().top - STICKY_HEADER_OFFSET })
  }
}

// 複製 <pre> 的純文字：行號由 CSS 計數器產生，不會出現在複製結果中
async function copyCode(block: HTMLElement, button: HTMLElement) {
  const code = block.querySelector("pre")?.textContent ?? ""

  try {
    await navigator.clipboard.writeText(code)
  } catch {
    const toast = await loadToast()
    toast.error("複製失敗，請手動選取程式碼")
    return
  }

  button.setAttribute(CODE_BLOCK_COPIED_ATTR, "")
  button.setAttribute("aria-label", "已複製")
  const toast = await loadToast()
  toast.success("已複製程式碼到剪貼簿")

  window.setTimeout(() => {
    button.removeAttribute(CODE_BLOCK_COPIED_ATTR)
    button.setAttribute("aria-label", "複製程式碼")
  }, COPIED_RESET_MS)
}

// 程式碼區塊的按鈕由伺服器輸出在文章 HTML 中；這裡以單一委派監聽處理所有區塊，
// 不需為每個區塊掛載 React 元件，也不會在 hydration 時改動既有的伺服器 HTML
export function CodeBlockInteractions() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return

      const button = event.target.closest<HTMLElement>(ACTION_SELECTOR)
      const block = button?.closest<HTMLElement>(CODE_BLOCK_SELECTOR)
      if (!button || !block) return

      switch (button.getAttribute(CODE_BLOCK_ACTION_ATTR)) {
        case CODE_BLOCK_ACTION.COPY:
          void copyCode(block, button)
          break
        case CODE_BLOCK_ACTION.TOGGLE_LINE_NUMBERS:
          toggleLineNumbers(block, button)
          break
        case CODE_BLOCK_ACTION.TOGGLE_COLLAPSE:
          toggleCollapse(block, button)
          break
      }
    }

    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [])

  // 絕對定位避免空的 Toast 容器佔用文章欄位的間距，通知本身為 fixed 定位，不受影響
  return (
    <div className="absolute size-0">
      <LazyToaster position="bottom-center" />
    </div>
  )
}
