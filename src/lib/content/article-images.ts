import "server-only"

import { imageSize } from "image-size"
import { getImageProps } from "next/image"

import { decodeHtmlEntities } from "@/lib/content/html-entities"
import { getPublicUrlPrefix } from "@/lib/storage/paths"

const IMAGE_TAG_PATTERN = /<img\b[^>]*>/g
const SRC_ATTR_PATTERN = /\bsrc="([^"]*)"/

// 與文章封面相同：桌機內文寬度約 720px，手機滿版
const ARTICLE_IMAGE_SIZES = "(min-width: 768px) 720px, 100vw"

// 讀不到原始尺寸時仍要產生縮圖來源，這組數字只影響 next/image 內部計算，不會輸出成寬高屬性
const FALLBACK_DIMENSIONS = { width: 1600, height: 900 }

// 圖片尺寸都寫在檔頭，只需下載開頭一小段；JPEG 的 EXIF 可能較長，因此保留 128 KB
const HEADER_BYTES = 128 * 1024
const FETCH_TIMEOUT_MS = 3000

// EXIF 方向 5～8 代表圖片需旋轉 90 度顯示，寬高要對調
const ROTATED_ORIENTATION_MIN = 5

export type ImageDimensions = { width: number; height: number }

const escapeAttribute = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;")

// 尺寸只用來預留版面，讀取失敗時略過，不影響文章輸出
export async function readImageDimensions(src: string): Promise<ImageDimensions | null> {
  try {
    const response = await fetch(src, {
      headers: { Range: `bytes=0-${HEADER_BYTES - 1}` },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!response.ok) return null

    const { width, height, orientation } = imageSize(new Uint8Array(await response.arrayBuffer()))
    if (!width || !height) return null

    return orientation !== undefined && orientation >= ROTATED_ORIENTATION_MIN
      ? { width: height, height: width }
      : { width, height }
  } catch {
    return null
  }
}

function getImageSource(tag: string) {
  const match = tag.match(SRC_ATTR_PATTERN)
  return match ? decodeHtmlEntities(match[1]) : null
}

function toResponsiveAttributes(src: string, dimensions: ImageDimensions | null) {
  const { width, height } = dimensions ?? FALLBACK_DIMENSIONS
  const { props } = getImageProps({ src, alt: "", width, height, sizes: ARTICLE_IMAGE_SIZES })

  return [
    `src="${escapeAttribute(props.src)}"`,
    `srcset="${escapeAttribute(props.srcSet ?? "")}"`,
    `sizes="${ARTICLE_IMAGE_SIZES}"`,
    `data-full-src="${escapeAttribute(src)}"`,
  ].join(" ")
}

// 輸入為 sanitize-html 清理後的 HTML，屬性值一律以雙引號包住，可安全以正則比對。
// 本站儲存空間的圖片改走圖片最佳化（依裝置取縮圖、轉現代格式），並補上寬高預留版面；
// 外部網址的圖片不在最佳化白名單內，維持原網址。結果隨呼叫端的 "use cache" 快取保存，不會每次請求重讀
export async function optimizeArticleImages(html: string) {
  const tags = html.match(IMAGE_TAG_PATTERN)
  if (!tags) return html

  const prefix = getPublicUrlPrefix()
  const isOwnImage = (src: string | null): src is string => src?.startsWith(prefix) ?? false

  const ownSources = [...new Set(tags.map(getImageSource).filter(isOwnImage))]
  const dimensions = new Map(
    await Promise.all(
      ownSources.map(async (src) => [src, await readImageDimensions(src)] as const),
    ),
  )

  return html.replace(IMAGE_TAG_PATTERN, (tag) => {
    const src = getImageSource(tag)
    const lazyAttributes = 'loading="lazy" decoding="async"'

    if (!isOwnImage(src)) return tag.replace(/^<img\b/, `<img ${lazyAttributes}`)

    const size = dimensions.get(src) ?? null
    const sizeAttributes = size ? `width="${size.width}" height="${size.height}" ` : ""

    return tag
      .replace(SRC_ATTR_PATTERN, () => toResponsiveAttributes(src, size))
      .replace(/^<img\b/, `<img ${sizeAttributes}${lazyAttributes}`)
  })
}
