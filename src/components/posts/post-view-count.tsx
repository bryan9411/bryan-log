"use client"

import { useEffect, useState } from "react"
import { EyeIcon } from "lucide-react"

import { getPostViewCount, recordPostView } from "@/lib/actions/post-views"

const VIEWED_STORAGE_PREFIX = "bryan-log-viewed:"

type PostViewCountProps = {
  slug: string
  initialCount: number
}

function hasViewedInSession(storageKey: string) {
  try {
    if (sessionStorage.getItem(storageKey)) return true
    sessionStorage.setItem(storageKey, "1")
    return false
  } catch {
    // 無痕模式等環境無法使用 sessionStorage 時仍照常計數
    return false
  }
}

// 頁面本身是快取的靜態內容，瀏覽數改在瀏覽器端載入後才累加並取回最新數字：
// 不需讓整頁變成動態渲染，也不會把爬蟲與預先載入（prefetch）算進閱讀數
export function PostViewCount({ slug, initialCount }: PostViewCountProps) {
  const [count, setCount] = useState(initialCount)

  useEffect(() => {
    let isActive = true
    // 以 sessionStorage 去重：重新整理或 React 開發模式重複執行 effect 時不會重複累加
    const alreadyViewed = hasViewedInSession(`${VIEWED_STORAGE_PREFIX}${slug}`)
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
