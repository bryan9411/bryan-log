import type { Metadata } from "next"
import { FolderKanbanIcon } from "lucide-react"

import { AdminEmptyState } from "@/components/admin/admin-empty-state"
import { AdminPageHeader } from "@/components/admin/admin-page-header"

export const metadata: Metadata = {
  title: "專案管理",
}

export default function AdminProjectsPage() {
  return (
    <>
      <AdminPageHeader title="專案管理" description="維護作品集與精選專案" />
      <AdminEmptyState
        icon={FolderKanbanIcon}
        title="專案管理建置中"
        description="作品新增、精選釘選與排序功能將於後續階段開放。"
      />
    </>
  )
}
