import type { Metadata } from "next"
import { Suspense } from "react"

import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { CategoriesSkeleton } from "@/components/admin/categories/categories-skeleton"
import { ProjectCategoryManager } from "@/components/admin/categories/project-category-manager"
import { requireAdmin } from "@/lib/auth/session"
import { getAdminProjectCategoryTree } from "@/lib/data/admin-categories"

export const metadata: Metadata = {
  title: "專案分類",
}

async function ProjectCategoriesSection() {
  await requireAdmin()
  const nodes = await getAdminProjectCategoryTree()

  return <ProjectCategoryManager nodes={nodes} />
}

export default function AdminProjectCategoriesPage() {
  return (
    <>
      <AdminPageHeader
        title="專案分類"
        description="精選專案的雙層分類（例如網站、工具、App），變更會即時同步到作品集頁面的篩選器"
      />
      <Suspense fallback={<CategoriesSkeleton />}>
        <ProjectCategoriesSection />
      </Suspense>
    </>
  )
}
