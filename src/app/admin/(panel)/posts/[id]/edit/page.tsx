import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ArrowLeftIcon } from "lucide-react"
import { z } from "zod"

import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { PostForm } from "@/components/admin/posts/post-form"
import { PostFormSkeleton } from "@/components/admin/posts/post-form-skeleton"
import { Button } from "@/components/ui/button"
import { POST_CREATED_PARAM, ROUTES } from "@/config/routes"
import { CATEGORY_TYPE } from "@/lib/constants/content"
import { getCategoryTree } from "@/lib/data/categories"
import { getEditablePost } from "@/lib/data/posts"
import { postIntentSchema } from "@/lib/validations/post"

export const metadata: Metadata = {
  title: "編輯文章",
}

// Next.js 16：params 與 searchParams 皆為 Promise，必須 await 後才能取值
async function EditPostFormLoader({ params, searchParams }: PageProps<"/admin/posts/[id]/edit">) {
  const { id } = await params
  const query = await searchParams

  if (!z.uuid().safeParse(id).success) notFound()

  const [post, categories] = await Promise.all([
    getEditablePost(id),
    getCategoryTree(CATEGORY_TYPE.POST),
  ])

  if (!post) notFound()

  const createdIntent = postIntentSchema.safeParse(query[POST_CREATED_PARAM])

  return (
    <PostForm
      key={post.id}
      post={post}
      categories={categories}
      createdIntent={createdIntent.success ? createdIntent.data : null}
    />
  )
}

export default function EditPostPage(props: PageProps<"/admin/posts/[id]/edit">) {
  return (
    <>
      <AdminPageHeader
        title="編輯文章"
        actions={
          <Button asChild variant="ghost">
            <Link href={ROUTES.ADMIN_POSTS}>
              <ArrowLeftIcon aria-hidden />
              返回文章列表
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<PostFormSkeleton />}>
        <EditPostFormLoader {...props} />
      </Suspense>
    </>
  )
}
