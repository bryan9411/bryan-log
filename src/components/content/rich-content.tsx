import { PROSE_CLASS } from "@/lib/content/prose"
import { cn } from "@/lib/utils"

type RichContentProps = {
  html: string
  className?: string
}

// html 必須是已在伺服器端以 sanitizeArticleHtml 清理過的內容
// .article-content 讓每個區塊各自套用 content-visibility: auto，視窗外的段落略過排版與繪製
export function RichContent({ html, className }: RichContentProps) {
  return (
    <div
      className={cn("article-content", PROSE_CLASS, className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
