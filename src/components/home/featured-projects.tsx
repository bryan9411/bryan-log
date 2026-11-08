import { FolderGit2Icon } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { ProjectCard } from "@/components/projects/project-card"
import { PROJECT_GRID_CLASS } from "@/components/projects/project-card"
import { HOME_FEATURED_PROJECTS_LIMIT } from "@/config/home"
import { getFeaturedProjects } from "@/lib/data/public-projects"

// 查詢有 "use cache"，內容會一併預渲染進靜態外殼由 CDN 回應；後台更新時以快取標籤失效，排程內容則靠快取到期
export async function FeaturedProjects() {
  const projects = await getFeaturedProjects(HOME_FEATURED_PROJECTS_LIMIT)

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={FolderGit2Icon}
        title="尚無精選專案"
        description="作品整理中，很快就會在這裡與你見面。"
      />
    )
  }

  return (
    <ul className={PROJECT_GRID_CLASS}>
      {projects.map((project) => (
        <li key={project.slug} className="flex">
          <ProjectCard project={project} />
        </li>
      ))}
    </ul>
  )
}
