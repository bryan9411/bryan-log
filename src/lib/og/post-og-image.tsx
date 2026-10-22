import "server-only"

import { ImageResponse } from "next/og"

import { siteConfig } from "@/config/site"
import { formatCategoryPath } from "@/lib/content/category-filter"
import { getPublishedPost } from "@/lib/data/public-posts"

export const POST_OG_IMAGE_SIZE = { width: 1200, height: 630 }
export const POST_OG_IMAGE_CONTENT_TYPE = "image/png"
export const POST_OG_IMAGE_ALT = `${siteConfig.name} 技術文章`

const TITLE_MAX_LENGTH = 72
const FONT_FAMILY = "Noto Sans TC"
const FONT_WEIGHT = { REGULAR: 400, BOLD: 700 } as const

// 深色品牌底色：在各社群平台的淺色與深色介面中都有足夠對比
const COLOR = {
  BACKGROUND: "#09090b",
  SURFACE: "#18181b",
  BORDER: "rgba(255, 255, 255, 0.12)",
  FOREGROUND: "#fafafa",
  MUTED: "#a1a1aa",
  ACCENT: "#3987e5",
} as const

type FontWeight = (typeof FONT_WEIGHT)[keyof typeof FONT_WEIGHT]

// Satori 不支援 woff2，且內建字型沒有中文字；以 Google Fonts 的 text 參數只下載畫面上用到的字，
// 伺服器端請求未帶瀏覽器 User-Agent 時，回應的即是 Satori 可用的 TrueType 字型
async function loadGoogleFont(weight: FontWeight, text: string) {
  const query = new URLSearchParams({ family: `${FONT_FAMILY}:wght@${weight}`, text })
  const css = await fetch(`https://fonts.googleapis.com/css2?${query}`).then((response) =>
    response.text(),
  )
  const fontUrl = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1]
  if (!fontUrl) throw new Error("找不到可用的字型檔")

  const response = await fetch(fontUrl)
  if (!response.ok) throw new Error(`字型下載失敗：${response.status}`)
  return response.arrayBuffer()
}

// 字型下載失敗時仍輸出圖片（中文可能以預設字型顯示），不讓分享預覽整個失效
async function loadFonts(text: string) {
  try {
    const [regular, bold] = await Promise.all([
      loadGoogleFont(FONT_WEIGHT.REGULAR, text),
      loadGoogleFont(FONT_WEIGHT.BOLD, text),
    ])

    return [
      { name: FONT_FAMILY, data: regular, weight: FONT_WEIGHT.REGULAR, style: "normal" as const },
      { name: FONT_FAMILY, data: bold, weight: FONT_WEIGHT.BOLD, style: "normal" as const },
    ]
  } catch (error) {
    console.error("社群分享圖字型載入失敗", error)
    return undefined
  }
}

const truncate = (text: string) =>
  text.length > TITLE_MAX_LENGTH ? `${text.slice(0, TITLE_MAX_LENGTH)}…` : text

// 文章社群分享圖：網站品牌、分類標籤、文章標題與作者名稱；找不到文章時輸出網站品牌圖
export async function renderPostOgImage(slug: string) {
  const post = await getPublishedPost(slug)

  const title = truncate(post?.title ?? siteConfig.title)
  const category = post ? formatCategoryPath(post) : null
  const readingLabel = post ? `約 ${post.readingMinutes} 分鐘閱讀` : siteConfig.description
  const siteHost = new URL(siteConfig.url).host
  const authorInitial = siteConfig.author.slice(0, 1).toUpperCase()

  const fonts = await loadFonts(
    [
      siteConfig.name,
      title,
      category,
      readingLabel,
      siteConfig.author,
      siteHost,
      authorInitial,
      "・…",
    ]
      .filter(Boolean)
      .join(""),
  )

  const renderCategory = () => {
    if (!category) return null

    return (
      <div
        style={{
          display: "flex",
          alignSelf: "flex-start",
          padding: "8px 20px",
          borderRadius: 999,
          border: `1px solid ${COLOR.BORDER}`,
          background: COLOR.SURFACE,
          color: COLOR.FOREGROUND,
          fontSize: 26,
        }}
      >
        {category}
      </div>
    )
  }

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        background: `radial-gradient(circle at 85% 0%, rgba(57, 135, 229, 0.28), transparent 55%), ${COLOR.BACKGROUND}`,
        color: COLOR.FOREGROUND,
        fontFamily: fonts ? FONT_FAMILY : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 14, height: 40, borderRadius: 4, background: COLOR.ACCENT }} />
        <div style={{ fontSize: 34, fontWeight: FONT_WEIGHT.BOLD, letterSpacing: -0.5 }}>
          {siteConfig.name}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {renderCategory()}
        <div
          style={{
            display: "block",
            fontSize: title.length > 36 ? 58 : 68,
            fontWeight: FONT_WEIGHT.BOLD,
            lineHeight: 1.25,
            letterSpacing: -1,
            lineClamp: 3,
          }}
        >
          {title}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 28,
          borderTop: `1px solid ${COLOR.BORDER}`,
          fontSize: 26,
          color: COLOR.MUTED,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              background: COLOR.ACCENT,
              color: COLOR.FOREGROUND,
              fontWeight: FONT_WEIGHT.BOLD,
            }}
          >
            {authorInitial}
          </div>
          <div style={{ display: "flex", color: COLOR.FOREGROUND }}>{siteConfig.author}</div>
          <div style={{ display: "flex" }}>・{readingLabel}</div>
        </div>
        <div style={{ display: "flex" }}>{siteHost}</div>
      </div>
    </div>,
    { ...POST_OG_IMAGE_SIZE, fonts },
  )
}
