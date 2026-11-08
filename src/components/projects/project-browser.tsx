"use client"

import { FolderGit2Icon } from "lucide-react"

import { ContentBrowser } from "@/components/content/content-browser"
import { PROJECT_GRID_CLASS, ProjectCard } from "@/components/projects/project-card"
import type { CategoryTreeNode } from "@/lib/content/category-filter"
import type { ProjectSummary } from "@/lib/data/public-projects"

type ProjectBrowserProps = {
  projects: ProjectSummary[]
  categories: CategoryTreeNode[]
}

export function ProjectBrowser({ projects, categories }: ProjectBrowserProps) {
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
        <ul aria-label="作品列表" className={PROJECT_GRID_CLASS}>
          {filteredProjects.map((project) => (
            <li key={project.slug} className="flex">
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      )}
    </ContentBrowser>
  )
}
