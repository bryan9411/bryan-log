"use client"

import { useEffect, useState } from "react"

// 標題越過視窗頂端此距離（固定頁首高度 + 緩衝）即視為進入該段落
const ACTIVE_HEADING_OFFSET = 112

// Scrollspy：回傳目前閱讀段落的標題 id。每次捲動取「最後一個已越過判定線的標題」，
// 比 IntersectionObserver 更能正確處理很長或很短的段落；以 requestAnimationFrame 節流
export function useActiveHeading(ids: readonly string[]) {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (ids.length === 0) return

    let frame = 0

    const update = () => {
      frame = 0
      let current: string | null = null

      for (const id of ids) {
        const heading = document.getElementById(id)
        if (!heading || heading.getBoundingClientRect().top > ACTIVE_HEADING_OFFSET) break
        current = id
      }

      // 捲到頁尾時最後幾個短段落可能永遠越不過判定線，直接選取最後一個標題
      const isAtBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      setActiveId(isAtBottom ? ids[ids.length - 1] : current)
    }

    const scheduleUpdate = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    scheduleUpdate()
    window.addEventListener("scroll", scheduleUpdate, { passive: true })
    window.addEventListener("resize", scheduleUpdate)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", scheduleUpdate)
      window.removeEventListener("resize", scheduleUpdate)
    }
  }, [ids])

  return activeId
}
