import { ArchiveIcon } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { ArchiveTimeline, ArchiveYearNav } from "@/components/posts/archive-timeline"
import { PageHeader } from "@/components/site/page-header"
import { SiteContainer } from "@/components/site/site-container"
import { ROUTES } from "@/config/routes"
import { groupPostsByMonth } from "@/lib/content/archive"
import { getPublishedPosts } from "@/lib/data/public-posts"
import { createPageMetadata } from "@/lib/seo"

const TITLE = "文章歸檔"
const DESCRIPTION = "依年份與月份排列的完整文章時間軸，快速回顧每一段時期寫過的主題。"

export const metadata = createPageMetadata({
  path: ROUTES.ARCHIVES,
  title: TITLE,
  description: DESCRIPTION,
})

// 不依賴任何請求資料，整頁於建置時預渲染；發布或修改文章時隨文章快取標籤一起失效
export default async function ArchivesPage() {
  const years = groupPostsByMonth(await getPublishedPosts())
  const totalPosts = years.reduce((sum, { postCount }) => sum + postCount, 0)

  const renderContent = () => {
    if (years.length === 0) {
      return (
        <EmptyState
          icon={ArchiveIcon}
          title="還沒有任何文章"
          description="第一篇文章發布後會出現在這裡。"
        />
      )
    }

    return (
      <>
        <ArchiveYearNav years={years} />
        <ArchiveTimeline years={years} />
      </>
    )
  }

  return (
    <SiteContainer className="flex max-w-3xl flex-col gap-10 py-12 sm:py-16">
      <PageHeader
        title={TITLE}
        description={totalPosts > 0 ? `${DESCRIPTION}共 ${totalPosts} 篇。` : DESCRIPTION}
      />
      {renderContent()}
    </SiteContainer>
  )
}
