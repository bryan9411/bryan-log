import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { PlusIcon } from "lucide-react"

import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { ProjectsTable, ProjectsTableSkeleton } from "@/components/admin/projects/projects-table"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/config/routes"

export const metadata: Metadata = {
  title: "專案管理",
}

export default function AdminProjectsPage() {
  return (
    <>
      <AdminPageHeader
        title="專案管理"
        description="維護作品集與精選專案"
        actions={
          <Button asChild size="lg">
            <Link href={ROUTES.ADMIN_PROJECT_NEW}>
              <PlusIcon aria-hidden />
              新增作品
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<ProjectsTableSkeleton />}>
        <ProjectsTable />
      </Suspense>
    </>
  )
}
