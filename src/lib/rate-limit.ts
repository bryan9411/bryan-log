import "server-only"

type RateLimitWindow = {
  count: number
  resetAt: number
}

type RateLimiterOptions = {
  // 每個時間窗內允許的次數
  limit: number
  windowMs: number
  // 記憶體上限：超過時先清除過期紀錄，仍不足再移除最早建立的紀錄
  maxKeys: number
}

// 輕量的固定時間窗計數器，存放於伺服器程序記憶體中：不需額外服務即可擋下單一來源的大量請求。
// 多台執行個體或無伺服器環境下各自計數，屬於第一道防線；需要全域一致時應改用 Redis 等共享儲存
export function createRateLimiter({ limit, windowMs, maxKeys }: RateLimiterOptions) {
  const windows = new Map<string, RateLimitWindow>()

  const evict = (now: number) => {
    windows.forEach((window, key) => {
      if (window.resetAt <= now) windows.delete(key)
    })

    // Map 依插入順序迭代，第一個鍵即為最早建立的紀錄
    while (windows.size >= maxKeys) {
      const oldestKey = windows.keys().next().value
      if (oldestKey === undefined) break
      windows.delete(oldestKey)
    }
  }

  // 回傳 true 表示允許並已計入一次；false 表示已達上限
  return function consume(key: string, now = Date.now()) {
    const current = windows.get(key)

    if (!current || current.resetAt <= now) {
      if (!current && windows.size >= maxKeys) evict(now)
      windows.set(key, { count: 1, resetAt: now + windowMs })
      return true
    }

    if (current.count >= limit) return false

    current.count += 1
    return true
  }
}
