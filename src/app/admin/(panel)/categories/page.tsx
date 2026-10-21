import type { Metadata } from "next"
import { Suspense } from "react"

import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { CategoryManager } from "@/components/admin/categories/category-manager"
import { Skeleton } from "@/components/ui/skeleton"
import { requireAdmin } from "@/lib/auth/session"
import { getAdminCategoryTrees } from "@/lib/data/admin-categories"

export const metadata: Metadata = {
  title: "分類管理",
}

const SKELETON_ROWS = 6

async function CategoriesSection() {
  await requireAdmin()
  const trees = await getAdminCategoryTrees()

  return <CategoryManager trees={trees} />
}

function CategoriesSkeleton() {
  return (
    <div aria-hidden className="grid gap-4">
      <Skeleton className="h-10 w-72 rounded-xl" />
      <div className="flex justify-between">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="divide-y rounded-xl border bg-background">
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <div key={index} className="flex items-center gap-4 px-4 py-4">
            <Skeleton className="size-4" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="ml-auto h-5 w-24 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminCategoriesPage() {
  return (
    <>
      <AdminPageHeader
        title="分類管理"
        description="管理技術文章與作品集的雙層分類，變更會即時同步到前台篩選器"
      />
      <Suspense fallback={<CategoriesSkeleton />}>
        <CategoriesSection />
      </Suspense>
    </>
  )
}
