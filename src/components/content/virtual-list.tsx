"use client"

import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { useWindowVirtualizer } from "@tanstack/react-virtual"

import { cn } from "@/lib/utils"

const OVERSCAN = 6

// 伺服器沒有視窗尺寸，以常見桌機視窗預估首屏範圍，讓首屏項目直接輸出在 HTML 中（利於 SEO 與首次繪製）
const SSR_INITIAL_RECT = { width: 1024, height: 1200 }

type VirtualListProps<T> = {
  items: readonly T[]
  getItemKey: (item: T) => string
  renderItem: (item: T) => ReactNode
  estimateSize: number
  label: string
  lanes?: number
  gap?: number
  className?: string
}

// 以整個視窗為捲動容器的虛擬清單：只渲染可視範圍附近的項目，項目高度於渲染後實際量測
// lanes 大於 1 時為多欄瀑布流，每個項目放入目前最短的一欄
export function VirtualList<T>({
  items,
  getItemKey,
  renderItem,
  estimateSize,
  label,
  lanes = 1,
  gap = 0,
  className,
}: VirtualListProps<T>) {
  const listRef = useRef<HTMLUListElement>(null)
  const [scrollMargin, setScrollMargin] = useState(0)

  const virtualizer = useWindowVirtualizer({
    count: items.length,
    estimateSize: () => estimateSize,
    getItemKey: (index) => getItemKey(items[index]),
    overscan: OVERSCAN,
    lanes,
    gap,
    scrollMargin,
    initialRect: SSR_INITIAL_RECT,
  })

  // 清單上方的篩選列、圖片等高度可能變動，頁面高度一改變就重新計算清單在頁面中的起點
  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return

    const updateScrollMargin = () =>
      setScrollMargin(list.getBoundingClientRect().top + window.scrollY)

    updateScrollMargin()

    const observer = new ResizeObserver(updateScrollMargin)
    observer.observe(document.body)
    return () => observer.disconnect()
  }, [])

  const laneWidth = `((100% - ${(lanes - 1) * gap}px) / ${lanes})`

  return (
    <ul
      ref={listRef}
      aria-label={label}
      className={cn("relative", className)}
      style={{ height: virtualizer.getTotalSize() }}
    >
      {virtualizer.getVirtualItems().map((virtualItem) => (
        <li
          key={virtualItem.key}
          ref={virtualizer.measureElement}
          data-index={virtualItem.index}
          // 虛擬清單只渲染部分項目，以 aria 屬性告知輔助科技完整數量與目前位置
          aria-setsize={items.length}
          aria-posinset={virtualItem.index + 1}
          className="absolute top-0 flex"
          style={{
            width: `calc${laneWidth}`,
            left: `calc((${laneWidth} + ${gap}px) * ${virtualItem.lane})`,
            transform: `translateY(${virtualItem.start - virtualizer.options.scrollMargin}px)`,
          }}
        >
          {renderItem(items[virtualItem.index])}
        </li>
      ))}
    </ul>
  )
}
