import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { ArrowLeftIcon } from "lucide-react"

import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { PostFormSkeleton } from "@/components/admin/posts/post-form-skeleton"
import { ProjectForm } from "@/components/admin/projects/project-form"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/config/routes"
import { getProjectCategoryTree } from "@/lib/data/categories"

export const metadata: Metadata = {
  title: "新增作品",
}

async function NewProjectFormLoader() {
  const categories = await getProjectCategoryTree()
  return <ProjectForm categories={categories} />
}

export default function NewProjectPage() {
  return (
    <>
      <AdminPageHeader
        title="新增作品"
        description="填寫專案資訊後可先儲存草稿，確認無誤再正式發布至作品集"
        actions={
          <Button asChild variant="ghost">
            <Link href={ROUTES.ADMIN_PROJECTS}>
              <ArrowLeftIcon aria-hidden />
              返回作品列表
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<PostFormSkeleton />}>
        <NewProjectFormLoader />
      </Suspense>
    </>
  )
}
