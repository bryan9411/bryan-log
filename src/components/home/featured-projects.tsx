import { connection } from "next/server"
import { FolderGit2Icon } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { ProjectCard } from "@/components/home/project-card"
import { Skeleton } from "@/components/ui/skeleton"
import { HOME_FEATURED_PROJECTS_LIMIT, HOME_FEATURED_PROJECTS_SKELETON_COUNT } from "@/config/home"
import { getFeaturedProjects } from "@/lib/data/public-projects"

const PROJECT_GRID_CLASS = "grid gap-5 sm:grid-cols-2 lg:grid-cols-3"

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
  return (
    <ul aria-hidden className={PROJECT_GRID_CLASS}>
      {Array.from({ length: HOME_FEATURED_PROJECTS_SKELETON_COUNT }, (_, index) => (
        <li key={index} className="flex flex-col gap-4 rounded-xl p-5 ring-1 ring-foreground/10">
          <Skeleton className="h-5 w-2/3" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-7 w-20" />
          </div>
        </li>
      ))}
    </ul>
  )
}
