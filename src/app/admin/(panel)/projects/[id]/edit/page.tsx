import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ArrowLeftIcon } from "lucide-react"
import { z } from "zod"

import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { PostFormSkeleton } from "@/components/admin/posts/post-form-skeleton"
import { ProjectForm } from "@/components/admin/projects/project-form"
import { Button } from "@/components/ui/button"
import { POST_CREATED_PARAM, ROUTES } from "@/config/routes"
import { getEditableProject } from "@/lib/data/admin-projects"
import { getProjectCategoryTree } from "@/lib/data/categories"
import { postIntentSchema } from "@/lib/validations/post"

export const metadata: Metadata = {
  title: "編輯作品",
}

async function EditProjectFormLoader({
  params,
  searchParams,
}: PageProps<"/admin/projects/[id]/edit">) {
  const { id } = await params
  const query = await searchParams

  if (!z.uuid().safeParse(id).success) notFound()

  const [project, categories] = await Promise.all([
    getEditableProject(id),
    getProjectCategoryTree(),
  ])

  if (!project) notFound()

  const createdIntent = postIntentSchema.safeParse(query[POST_CREATED_PARAM])

  return (
    <ProjectForm
      key={project.id}
      project={project}
      categories={categories}
      createdIntent={createdIntent.success ? createdIntent.data : null}
    />
  )
}

export default function EditProjectPage(props: PageProps<"/admin/projects/[id]/edit">) {
  return (
    <>
      <AdminPageHeader
        title="編輯作品"
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
        <EditProjectFormLoader {...props} />
      </Suspense>
    </>
  )
}
