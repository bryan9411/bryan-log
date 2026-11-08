import Image from "next/image"

// 背景只取極小的縮圖，由瀏覽器放大後自然呈現柔焦；不使用 CSS blur，捲動時不必反覆計算大面積濾鏡
const BACKDROP_SIZES = "32px"

type ContainedCoverProps = {
  src: string
  alt: string
  sizes: string
  // 套用在前景圖片上，例如卡片的 hover 縮放效果
  className?: string
}

// 固定比例的框（縮圖、卡片）放入比例不同的封面時：前景完整顯示不裁切（object-contain），
// 背景以同一張圖的極小縮圖鋪滿，視覺上仍是滿版，不會出現灰邊，也不會切掉圖片的重點。
// 呼叫端的容器需為 relative 並設定 overflow-hidden。
export function ContainedCover({ src, alt, sizes, className }: ContainedCoverProps) {
  return (
    <>
      <Image src={src} alt="" aria-hidden fill sizes={BACKDROP_SIZES} className="object-cover" />
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={`object-contain ${className ?? ""}`}
      />
    </>
  )
}
