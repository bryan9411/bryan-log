import type { Metadata } from "next"

import { siteConfig } from "@/config/site"

const TWITTER_CARD = {
  SUMMARY: "summary",
  LARGE_IMAGE: "summary_large_image",
} as const

type ArticleMetadata = {
  publishedTime?: string | null
  modifiedTime?: string
  section?: string | null
  tags?: string[]
}

type PageMetadataInput = {
  path?: string
  title?: string
  description?: string | null
  image?: string | null
  // 頁面另有 opengraph-image／twitter-image 檔案產生分享圖時設為 true：
  // 圖片網址交由檔案慣例輸出（優先權高於 metadata），這裡只需改用大圖卡片
  hasGeneratedImage?: boolean
  article?: ArticleMetadata
}

export function absoluteUrl(path: string) {
  return new URL(path, siteConfig.url).toString()
}

// Next.js 合併 metadata 時 openGraph、twitter 是整個物件覆蓋而非深層合併，
// 因此每一頁都透過此函式補齊站點共用欄位，避免子頁面遺失 siteName、locale 等設定
// path 只在頁面層級傳入：根版型若設定 canonical，未覆寫的子頁面會全部被標成首頁的重複內容
export function createPageMetadata({
  path,
  title,
  description,
  image,
  hasGeneratedImage = false,
  article,
}: PageMetadataInput): Metadata {
  const socialTitle = title ? `${title}｜${siteConfig.name}` : siteConfig.title
  const resolvedDescription = description || siteConfig.description
  // 沒有圖片時不可輸出 images 鍵（即使值為 undefined）：Next.js 只在 images 未被指定時，
  // 才會套用 opengraph-image／twitter-image 檔案產生的分享圖
  const openGraphImages = image ? { images: [{ url: image, alt: title ?? siteConfig.name }] } : {}
  const twitterImages = image ? { images: [image] } : {}

  const sharedOpenGraph = {
    locale: siteConfig.ogLocale,
    siteName: siteConfig.name,
    title: socialTitle,
    description: resolvedDescription,
    ...openGraphImages,
    ...(path ? { url: path } : {}),
  }

  return {
    ...(title ? { title } : {}),
    description: resolvedDescription,
    ...(path ? { alternates: { canonical: path } } : {}),
    openGraph: article
      ? {
          ...sharedOpenGraph,
          type: "article",
          publishedTime: article.publishedTime ?? undefined,
          modifiedTime: article.modifiedTime,
          section: article.section ?? undefined,
          tags: article.tags,
          authors: [siteConfig.author],
        }
      : { ...sharedOpenGraph, type: "website" },
    twitter: {
      card: image || hasGeneratedImage ? TWITTER_CARD.LARGE_IMAGE : TWITTER_CARD.SUMMARY,
      title: socialTitle,
      description: resolvedDescription,
      ...twitterImages,
    },
  }
}

// JSON-LD 嵌在 <script> 中，需轉義 < 避免內容提前結束標籤造成 XSS
export function serializeJsonLd(data: Record<string, unknown>) {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}
