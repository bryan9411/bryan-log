import Image from "next/image"

type CoverImageProps = {
  src: string
  alt: string
}

// 封面寬度與圖片原始比例不一定相同（例如橫幅圖），強制裁成 16:9 會切掉兩側的重點內容，
// 因此依圖片原始比例完整顯示；width／height 只提供載入前的 16:9 預留空間，h-auto 讓高度改依實際比例計算。
// 過高的直式圖以 max-h 限制並完整縮放（object-contain），避免佔滿整個首屏。
// 封面位於首屏，以 preload 提早載入（Next.js 16 起取代已棄用的 priority）
const PLACEHOLDER_WIDTH = 1600
const PLACEHOLDER_HEIGHT = 900

export function CoverImage({ src, alt }: CoverImageProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-muted">
      <Image
        src={src}
        alt={alt}
        width={PLACEHOLDER_WIDTH}
        height={PLACEHOLDER_HEIGHT}
        preload
        sizes="(min-width: 768px) 720px, 100vw"
        className="h-auto max-h-[32rem] w-full object-contain"
      />
    </div>
  )
}
