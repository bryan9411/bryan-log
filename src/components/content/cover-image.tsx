import Image from "next/image"

import type { ImageDimensions } from "@/lib/content/article-images"

// 讀不到原始尺寸時的預留比例
const FALLBACK_DIMENSIONS: ImageDimensions = { width: 1600, height: 900 }

type CoverImageProps = {
  src: string
  alt: string
  // 圖片的實際尺寸：載入前就預留正確高度，圖片出現時版面才不會跳動
  dimensions: ImageDimensions | null
}

// 依圖片原始比例完整顯示，不強制裁切（例如橫幅圖）；過高的直式圖以 max-h 限制並完整縮放，避免佔滿整個首屏。
// 封面位於首屏，以 preload 提早載入（Next.js 16 起取代已棄用的 priority）
export function CoverImage({ src, alt, dimensions }: CoverImageProps) {
  const { width, height } = dimensions ?? FALLBACK_DIMENSIONS

  return (
    <div className="overflow-hidden rounded-xl border bg-muted">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        preload
        sizes="(min-width: 768px) 720px, 100vw"
        className="h-auto max-h-[32rem] w-full object-contain"
      />
    </div>
  )
}
