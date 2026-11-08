import { ProjectBrowser } from "@/components/projects/project-browser"
import { PageHeader } from "@/components/site/page-header"
import { SiteContainer } from "@/components/site/site-container"
import { ROUTES } from "@/config/routes"
import { getProjectCategoryTree } from "@/lib/data/categories"
import { getPublishedProjects } from "@/lib/data/public-projects"
import { createPageMetadata } from "@/lib/seo"

const TITLE = "精選專案"
const DESCRIPTION = "從需求分析到上線維運，親手打造的作品集，可依類型篩選。"

export const metadata = createPageMetadata({
  path: ROUTES.PROJECTS,
  title: TITLE,
  description: DESCRIPTION,
})

// 與文章列表相同：完整清單預渲染進靜態外殼，網址上的分類篩選由瀏覽器端套用
async function ProjectsExplorer() {
  const [projects, categories] = await Promise.all([
    getPublishedProjects(),
    getProjectCategoryTree(),
  ])

  return <ProjectBrowser projects={projects} categories={categories} />
}

export default function ProjectsPage() {
  return (
    <SiteContainer className="flex flex-col gap-10 py-12 sm:py-16">
      <PageHeader title={TITLE} description={DESCRIPTION} />
      <ProjectsExplorer />
    </SiteContainer>
  )
}
