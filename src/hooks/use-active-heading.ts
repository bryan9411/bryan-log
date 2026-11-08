"use client"

import { useEffect, useState } from "react"

// 標題越過視窗頂端此距離（固定頁首高度 + 緩衝）即視為進入該段落
const ACTIVE_HEADING_OFFSET = 112

// 下緣放大到涵蓋整份文件：判定線以下的標題一律完整位於範圍內，只有越過判定線時才會觸發，快速跳轉也不會漏接
const HEADING_ROOT_MARGIN = `-${ACTIVE_HEADING_OFFSET}px 0px 1000000px 0px`
const BOTTOM_ROOT_MARGIN = "0px 0px 2px 0px"

// Scrollspy：回傳目前閱讀段落的標題 id，也就是「最後一個已越過判定線的標題」。
// 以 IntersectionObserver 實作，捲動時不讀取版面，只有標題越線時才更新狀態
export function useActiveHeading(ids: readonly string[]) {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (ids.length === 0) return

    const crossedIds = new Set<string>()
    let isAtBottom = false

    // 捲到頁尾時最後幾個短段落可能永遠越不過判定線，直接選取最後一個標題
    const publish = () => {
      setActiveId(
        isAtBottom ? ids[ids.length - 1] : (ids.findLast((id) => crossedIds.has(id)) ?? null),
      )
    }

    const headingObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ target, boundingClientRect }) => {
          if (boundingClientRect.top <= ACTIVE_HEADING_OFFSET) crossedIds.add(target.id)
          else crossedIds.delete(target.id)
        })
        publish()
      },
      // 門檻設為 1：標題上緣碰到判定線（不再完整位於範圍內）就觸發，不必等整個標題越線
      { rootMargin: HEADING_ROOT_MARGIN, threshold: 1 },
    )

    ids.forEach((id) => {
      const heading = document.getElementById(id)
      if (heading) headingObserver.observe(heading)
    })

    const sentinel = document.createElement("div")
    sentinel.setAttribute("aria-hidden", "true")
    document.body.append(sentinel)

    const bottomObserver = new IntersectionObserver(
      ([entry]) => {
        isAtBottom = entry.isIntersecting
        publish()
      },
      { rootMargin: BOTTOM_ROOT_MARGIN },
    )
    bottomObserver.observe(sentinel)

    return () => {
      headingObserver.disconnect()
      bottomObserver.disconnect()
      sentinel.remove()
    }
  }, [ids])

  return activeId
}
