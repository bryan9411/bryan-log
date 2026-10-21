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
  article,
}: PageMetadataInput): Metadata {
  const socialTitle = title ? `${title}｜${siteConfig.name}` : siteConfig.title
  const resolvedDescription = description || siteConfig.description
  const images = image ? [{ url: image, alt: title ?? siteConfig.name }] : undefined

  const sharedOpenGraph = {
    locale: siteConfig.ogLocale,
    siteName: siteConfig.name,
    title: socialTitle,
    description: resolvedDescription,
    images,
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
      card: image ? TWITTER_CARD.LARGE_IMAGE : TWITTER_CARD.SUMMARY,
      title: socialTitle,
      description: resolvedDescription,
      images: image ? [image] : undefined,
    },
  }
}

// JSON-LD 嵌在 <script> 中，需轉義 < 避免內容提前結束標籤造成 XSS
export function serializeJsonLd(data: Record<string, unknown>) {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}
