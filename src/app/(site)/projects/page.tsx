import { ComingSoon } from "@/components/site/coming-soon"
import { ROUTES } from "@/config/routes"
import { createPageMetadata } from "@/lib/seo"

const TITLE = "精選專案"
const DESCRIPTION = "從需求分析到上線維運，親手打造的代表作品。"

export const metadata = createPageMetadata({
  path: ROUTES.PROJECTS,
  title: TITLE,
  description: DESCRIPTION,
})

// 階段五將替換為完整的作品集列表
export default function ProjectsPage() {
  return <ComingSoon title={TITLE} description="完整作品集即將上線，目前可先從首頁瀏覽精選專案。" />
}
