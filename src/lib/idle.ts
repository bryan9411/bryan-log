const IDLE_TIMEOUT_MS = 2000
const FALLBACK_DELAY_MS = 200

// 瀏覽器閒置時才執行，避開首屏 hydration；回傳取消函式。Safari 沒有 requestIdleCallback，改用短延遲
export function runWhenIdle(callback: () => void) {
  if ("requestIdleCallback" in window) {
    const handle = window.requestIdleCallback(callback, { timeout: IDLE_TIMEOUT_MS })
    return () => window.cancelIdleCallback(handle)
  }

  const handle = globalThis.setTimeout(callback, FALLBACK_DELAY_MS)
  return () => globalThis.clearTimeout(handle)
}
