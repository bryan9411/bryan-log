import { FolderKanbanIcon } from "lucide-react"

import { ProjectsTableView } from "@/components/admin/projects/projects-table-view"
import { EmptyState } from "@/components/empty-state"
import { listAdminProjects } from "@/lib/data/admin-projects"
import { getRequestTime } from "@/lib/request-time"

export async function ProjectsTable() {
  // 相對時間需要讀取目前時間，getRequestTime 會先呼叫 connection() 宣告為請求期間渲染
  const [projects, now] = await Promise.all([listAdminProjects(), getRequestTime()])

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={FolderKanbanIcon}
        title="還沒有任何作品"
        description="點擊右上角的「新增作品」建立第一個作品集專案。"
      />
    )
  }

  return <ProjectsTableView projects={projects} now={now} />
}

export function ProjectsTableSkeleton() {
  return (
    <div
      className="h-96 animate-pulse rounded-xl border bg-muted/50"
      aria-busy
      aria-label="作品列表載入中"
    />
  )
}
