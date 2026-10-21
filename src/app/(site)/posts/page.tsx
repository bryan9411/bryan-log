import { ComingSoon } from "@/components/site/coming-soon"
import { ROUTES } from "@/config/routes"
import { createPageMetadata } from "@/lib/seo"

const TITLE = "技術文章"
const DESCRIPTION = "前端工程、全端架構與資安實踐的技術筆記。"

export const metadata = createPageMetadata({
  path: ROUTES.POSTS,
  title: TITLE,
  description: DESCRIPTION,
})

// 階段五將替換為完整的文章列表與分類篩選
export default function PostsPage() {
  return (
    <ComingSoon
      title={TITLE}
      description="文章列表與分類篩選即將上線，目前可先從首頁閱讀最新文章。"
    />
  )
}
