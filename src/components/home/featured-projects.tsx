import { connection } from "next/server"
import { FolderGit2Icon } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { ProjectCard } from "@/components/projects/project-card"
import {
  PROJECT_GRID_CLASS,
  ProjectGridSkeleton,
} from "@/components/projects/project-grid-skeleton"
import { HOME_FEATURED_PROJECTS_LIMIT, HOME_FEATURED_PROJECTS_SKELETON_COUNT } from "@/config/home"
import { getFeaturedProjects } from "@/lib/data/public-projects"

// connection() 讓此區塊成為請求時才渲染的動態洞，於 Suspense 內串流；
// 查詢本身仍有 "use cache"，命中快取時幾乎零延遲，後台更新後也能即時反映
export async function FeaturedProjects() {
  await connection()
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

export function FeaturedProjectsSkeleton() {
  return <ProjectGridSkeleton count={HOME_FEATURED_PROJECTS_SKELETON_COUNT} />
}
