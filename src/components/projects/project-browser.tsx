"use client"

import { FolderGit2Icon } from "lucide-react"

import { ContentBrowser } from "@/components/content/content-browser"
import { VirtualList } from "@/components/content/virtual-list"
import { ProjectCard } from "@/components/projects/project-card"
import { useResponsiveLanes, type LaneBreakpoint } from "@/hooks/use-responsive-lanes"
import type { CategoryTreeNode } from "@/lib/content/category-filter"
import type { ProjectSummary } from "@/lib/data/public-projects"

const ESTIMATED_CARD_HEIGHT = 260
const GRID_GAP = 20

// 與首頁精選專案的 sm:grid-cols-2 lg:grid-cols-3 斷點一致
const LANE_BREAKPOINTS: LaneBreakpoint[] = [
  { query: "(min-width: 40rem)", lanes: 2 },
  { query: "(min-width: 64rem)", lanes: 3 },
]

type ProjectBrowserProps = {
  projects: ProjectSummary[]
  categories: CategoryTreeNode[]
}

export function ProjectBrowser({ projects, categories }: ProjectBrowserProps) {
  const lanes = useResponsiveLanes(LANE_BREAKPOINTS)

  return (
    <ContentBrowser
      items={projects}
      categories={categories}
      unit="個作品"
      emptyIcon={FolderGit2Icon}
      emptyTitle="尚無作品"
      emptyDescription="作品整理中，很快就會在這裡與你見面。"
    >
      {(filteredProjects) => (
        <VirtualList
          items={filteredProjects}
          getItemKey={(project) => project.slug}
          estimateSize={ESTIMATED_CARD_HEIGHT}
          label="作品列表"
          lanes={lanes}
          gap={GRID_GAP}
          renderItem={(project) => <ProjectCard project={project} />}
        />
      )}
    </ContentBrowser>
  )
}
