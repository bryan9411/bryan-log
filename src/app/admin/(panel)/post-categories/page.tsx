import type { Metadata } from "next"
import { Suspense } from "react"

import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { CategoriesSkeleton } from "@/components/admin/categories/categories-skeleton"
import { PostCategoryManager } from "@/components/admin/categories/post-category-manager"
import { requireAdmin } from "@/lib/auth/session"
import { getAdminSectionCategoryGroups } from "@/lib/data/admin-categories"

export const metadata: Metadata = {
  title: "文章分類",
}

async function PostCategoriesSection() {
  await requireAdmin()
  const groups = await getAdminSectionCategoryGroups()

  return <PostCategoryManager groups={groups} />
}

export default function AdminPostCategoriesPage() {
  return (
    <>
      <AdminPageHeader
        title="文章分類"
        description="內容區塊（例如技術文章、旅遊心得）與其底下的雙層分類，變更會即時同步到前台導覽列與篩選器"
      />
      <Suspense fallback={<CategoriesSkeleton hasTabs />}>
        <PostCategoriesSection />
      </Suspense>
    </>
  )
}
