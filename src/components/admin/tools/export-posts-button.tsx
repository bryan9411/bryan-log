import { DownloadIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { API_ROUTES } from "@/config/routes"

type ExportPostsButtonProps = React.ComponentProps<typeof Button>

// 下載由 Route Handler 產生的 ZIP；使用一般連結避免被預先載入，也不需等待客戶端 JavaScript
export function ExportPostsButton({ variant = "outline", ...props }: ExportPostsButtonProps) {
  return (
    <Button asChild variant={variant} {...props}>
      <a href={API_ROUTES.POSTS_EXPORT} download>
        <DownloadIcon aria-hidden />
        匯出 Markdown 備份
      </a>
    </Button>
  )
}
