"use client"

import { useSyncExternalStore } from "react"

export type LaneBreakpoint = {
  query: string
  lanes: number
}

const SERVER_LANES = 1

// 依視窗寬度回傳欄數；伺服器與 hydration 期間一律為單欄，避免與伺服器輸出不一致
export function useResponsiveLanes(breakpoints: readonly LaneBreakpoint[]) {
  const getSnapshot = () =>
    breakpoints.findLast(({ query }) => window.matchMedia(query).matches)?.lanes ?? SERVER_LANES

  const subscribe = (onChange: () => void) => {
    const queries = breakpoints.map(({ query }) => window.matchMedia(query))
    queries.forEach((query) => query.addEventListener("change", onChange))
    return () => queries.forEach((query) => query.removeEventListener("change", onChange))
  }

  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_LANES)
}
