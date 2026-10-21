import type { Metadata } from "next"

import { siteConfig } from "@/config/site"

const TWITTER_CARD = "summary"

type PageMetadataInput = {
  path?: string
  title?: string
  description?: string
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
  description = siteConfig.description,
}: PageMetadataInput): Metadata {
  const socialTitle = title ? `${title}｜${siteConfig.name}` : siteConfig.title

  return {
    ...(title ? { title } : {}),
    description,
    ...(path ? { alternates: { canonical: path } } : {}),
    openGraph: {
      type: "website",
      locale: siteConfig.ogLocale,
      siteName: siteConfig.name,
      ...(path ? { url: path } : {}),
      title: socialTitle,
      description,
    },
    twitter: {
      card: TWITTER_CARD,
      title: socialTitle,
      description,
    },
  }
}
