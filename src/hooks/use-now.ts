"use client"

import { useEffect, useState } from "react"

// 定時更新的目前時間，用於「X 秒前」這類相對時間顯示；初始值為 null 以避免 hydration 不一致
export function useNow(intervalMs: number) {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => setNow(Date.now())
    const timer = window.setInterval(tick, intervalMs)
    const initial = window.setTimeout(tick, 0)

    return () => {
      window.clearInterval(timer)
      window.clearTimeout(initial)
    }
  }, [intervalMs])

  return now
}
