"use client"

import { useTheme } from "next-themes"
import { useEffect } from "react"

import { THEME } from "@/lib/constants/theme"

const MERMAID_BLOCK_SELECTOR = '.article-content .code-block[data-language="mermaid"]'
const DIAGRAM_CLASS = "mermaid-diagram"

let renderCount = 0

// 文章中的 Mermaid 程式碼區塊由伺服器輸出為一般程式碼區塊（未啟用 JavaScript 時仍可閱讀原始碼），
// 瀏覽器端再把它換成圖表。mermaid 體積大，只在頁面確實有圖表時才動態載入
export function MermaidDiagrams() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const blocks = [...document.querySelectorAll<HTMLElement>(MERMAID_BLOCK_SELECTOR)]
    if (blocks.length === 0) return

    let isCancelled = false
    const figures: HTMLElement[] = []

    const renderAll = async () => {
      const { default: mermaid } = await import("mermaid")
      if (isCancelled) return

      // strict：圖表內的 HTML 標籤會被清理、點擊事件停用；文章內的 %%{init}%% 設定仍可覆寫主題
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: resolvedTheme === THEME.DARK ? "dark" : "default",
      })

      for (const block of blocks) {
        const source = block.querySelector("pre")?.textContent?.trim()
        if (!source) continue

        try {
          const { svg } = await mermaid.render(`mermaid-diagram-${++renderCount}`, source)
          if (isCancelled) return

          const figure = document.createElement("figure")
          figure.className = DIAGRAM_CLASS
          figure.innerHTML = svg
          block.before(figure)
          block.hidden = true
          figures.push(figure)
        } catch (error) {
          // 語法錯誤時保留原本的程式碼區塊，讀者至少還能看到原始碼
          console.error("Mermaid 圖表渲染失敗", error)
        }
      }
    }

    void renderAll()

    // 切換主題時移除舊圖表並還原程式碼區塊，下一次 effect 會以新主題重新渲染
    return () => {
      isCancelled = true
      figures.forEach((figure) => figure.remove())
      blocks.forEach((block) => {
        block.hidden = false
      })
    }
  }, [resolvedTheme])

  return null
}
