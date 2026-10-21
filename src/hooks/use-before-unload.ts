"use client"

import { useEffect } from "react"

// 有未儲存變更時，關閉分頁或重新整理前由瀏覽器跳出確認視窗
export function useBeforeUnload(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [enabled])
}
