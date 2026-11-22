import type { Metadata } from "next"

import { createPageMetadata } from "@/lib/seo"

// 第一期雷達頁只是資料頁，不開放搜尋引擎索引（也不加入 sitemap 與 llms.txt），但允許跟隨外部連結
export function createRadarPageMetadata(input: {
  path: string
  title: string
  description: string
}): Metadata {
  return { ...createPageMetadata(input), robots: { index: false, follow: true } }
}
