import Image from "next/image"

import { cn } from "@/lib/utils"

// 模糊半徑需隨框的大小調整：小縮圖用大半徑時，邊緣會混入透明而出現淡色帶
const BACKDROP_BLUR_CLASS = {
  sm: "blur-xs",
  lg: "blur-xl",
} as const

type ContainedCoverProps = {
  src: string
  alt: string
  sizes: string
  // 套用在前景圖片上，例如卡片的 hover 縮放效果
  className?: string
  // 框寬約 100px 以下（例如後台列表縮圖）用 sm
  blur?: keyof typeof BACKDROP_BLUR_CLASS
}

// 固定比例的框（縮圖、卡片）放入比例不同的封面時：前景完整顯示不裁切（object-contain），
// 背景以同一張圖放大模糊鋪滿，視覺上仍是滿版，不會出現灰邊，也不會切掉圖片的重點。
// 背景放大 1.5 倍，讓模糊後淡出的邊緣落在框外；兩張圖使用相同的 src 與 sizes，瀏覽器只會下載一次。
// 呼叫端的容器需為 relative 並設定 overflow-hidden。
export function ContainedCover({ src, alt, sizes, className, blur = "lg" }: ContainedCoverProps) {
  return (
    <>
      <Image
        src={src}
        alt=""
        aria-hidden
        fill
        sizes={sizes}
        className={cn("scale-150 object-cover", BACKDROP_BLUR_CLASS[blur])}
      />
      <Image src={src} alt={alt} fill sizes={sizes} className={cn("object-contain", className)} />
    </>
  )
}
