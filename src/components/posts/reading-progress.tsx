"use client"

import { useEffect, useRef } from "react"

// 吸頂閱讀進度條：捲動時只改寫 transform（由合成器處理，不觸發重排），
// 並以 requestAnimationFrame 合併同一影格內的多次捲動事件，也不經過 React 狀態重新渲染，維持 60fps
export function ReadingProgress() {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const bar = barRef.current
    if (!bar) return

    const root = document.documentElement
    let frame = 0
    let maxScroll = 0

    const paint = () => {
      frame = 0
      const progress = maxScroll > 0 ? Math.min(Math.max(window.scrollY / maxScroll, 0), 1) : 0
      bar.style.transform = `scaleX(${progress})`
    }

    const schedulePaint = () => {
      if (frame === 0) frame = window.requestAnimationFrame(paint)
    }

    // 圖片載入或視窗縮放都會改變可捲動高度，只在尺寸變化時重新量測，捲動時不讀取版面
    const measure = () => {
      maxScroll = root.scrollHeight - window.innerHeight
      schedulePaint()
    }

    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(document.body)
    window.addEventListener("scroll", schedulePaint, { passive: true })
    window.addEventListener("resize", measure)
    measure()

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener("scroll", schedulePaint)
      window.removeEventListener("resize", measure)
      window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5">
      <div
        ref={barRef}
        className="h-full origin-left bg-primary will-change-transform"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  )
}
