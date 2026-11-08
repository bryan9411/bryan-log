import { ImageIcon } from "lucide-react"

import { ContainedCover } from "@/components/content/contained-cover"
import { cn } from "@/lib/utils"

const THUMBNAIL_CLASS = "relative h-10 w-14 shrink-0 overflow-hidden rounded-md border"

type CoverThumbnailProps = {
  src: string | null
}

// 沒有封面時以同尺寸的漸層色塊占位，表格每列高度與對齊保持一致
export function CoverThumbnail({ src }: CoverThumbnailProps) {
  if (!src) {
    return (
      <div
        className={cn(
          THUMBNAIL_CLASS,
          "flex items-center justify-center bg-linear-to-br from-muted to-muted-foreground/15 text-muted-foreground/70",
        )}
      >
        <ImageIcon className="size-4" aria-hidden />
        <span className="sr-only">無封面</span>
      </div>
    )
  }

  // 與前台封面一致完整顯示不裁切，比例不同的部分以模糊背景補滿
  return (
    <div className={cn(THUMBNAIL_CLASS, "bg-muted")}>
      <ContainedCover src={src} alt="" sizes="56px" />
    </div>
  )
}
