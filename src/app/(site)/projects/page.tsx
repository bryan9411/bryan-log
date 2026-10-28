import { connection } from "next/server"
import { Suspense } from "react"

import { CategoryFilterSkeleton } from "@/components/content/category-filter-skeleton"
import { ProjectBrowser } from "@/components/projects/project-browser"
import { ProjectGridSkeleton } from "@/components/projects/project-grid-skeleton"
import { PageHeader } from "@/components/site/page-header"
import { SiteContainer } from "@/components/site/site-container"
import { ROUTES } from "@/config/routes"
import { getProjectCategoryTree } from "@/lib/data/categories"
import { getPublishedProjects } from "@/lib/data/public-projects"
import { createPageMetadata } from "@/lib/seo"

const TITLE = "精選專案"
const DESCRIPTION = "從需求分析到上線維運，親手打造的作品集，可依類型篩選。"
const SKELETON_COUNT = 6

export const metadata = createPageMetadata({
  path: ROUTES.PROJECTS,
  title: TITLE,
  description: DESCRIPTION,
})

// 與文章列表相同：篩選條件在網址上，需在請求時渲染才能於伺服器端直接輸出篩選結果
async function ProjectsExplorer() {
  await connection()

  const [projects, categories] = await Promise.all([
    getPublishedProjects(),
    getProjectCategoryTree(),
  ])

  return <ProjectBrowser projects={projects} categories={categories} />
}

function ProjectsExplorerSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <CategoryFilterSkeleton />
      <ProjectGridSkeleton count={SKELETON_COUNT} />
    </div>
  )
}

export default function ProjectsPage() {
  return (
    <SiteContainer className="flex flex-col gap-10 py-12 sm:py-16">
      <PageHeader title={TITLE} description={DESCRIPTION} />
      <Suspense fallback={<ProjectsExplorerSkeleton />}>
        <ProjectsExplorer />
      </Suspense>
    </SiteContainer>
  )
}
