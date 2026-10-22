"use client"

import { useEffect, useState } from "react"
import { EyeIcon } from "lucide-react"

import { getPostViewCount, recordPostView } from "@/lib/actions/post-views"
import { VIEW_COOLDOWN_MS } from "@/lib/constants/post-views"

const VIEWED_STORAGE_PREFIX = "bryan-log-viewed:"

type PostViewCountProps = {
  slug: string
  initialCount: number
}

// 以 LocalStorage 記錄上次累計時間：重新整理、重開瀏覽器或 React 開發模式重複執行 effect 都不會重複累加
function isWithinCooldown(storageKey: string) {
  try {
    const lastViewedAt = Number(localStorage.getItem(storageKey))
    const now = Date.now()

    if (lastViewedAt > 0 && now - lastViewedAt < VIEW_COOLDOWN_MS) return true

    localStorage.setItem(storageKey, String(now))
    return false
  } catch {
    // 無痕模式等環境無法使用 LocalStorage 時交由伺服器端的頻率限制把關
    return false
  }
}

// 頁面本身是快取的靜態內容，瀏覽數改在瀏覽器端載入後才累加並取回最新數字：
// 不需讓整頁變成動態渲染，也不會把爬蟲與預先載入（prefetch）算進閱讀數
export function PostViewCount({ slug, initialCount }: PostViewCountProps) {
  const [count, setCount] = useState(initialCount)

  useEffect(() => {
    let isActive = true
    const alreadyViewed = isWithinCooldown(`${VIEWED_STORAGE_PREFIX}${slug}`)
    const request = alreadyViewed ? getPostViewCount(slug) : recordPostView(slug)

    request.then((latest) => {
      if (isActive && latest !== null) setCount(latest)
    })

    return () => {
      isActive = false
    }
  }, [slug])

  return (
    <span className="flex items-center gap-1">
      <EyeIcon className="size-3.5" aria-hidden />
      <span className="tabular-nums">{count.toLocaleString("zh-TW")}</span> 次閱讀
    </span>
  )
}
