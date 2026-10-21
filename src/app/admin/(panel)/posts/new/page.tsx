import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { ArrowLeftIcon } from "lucide-react"

import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { PostForm } from "@/components/admin/posts/post-form"
import { PostFormSkeleton } from "@/components/admin/posts/post-form-skeleton"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/config/routes"
import { CATEGORY_TYPE } from "@/lib/constants/content"
import { getCategoryTree } from "@/lib/data/categories"

export const metadata: Metadata = {
  title: "新增文章",
}

async function NewPostFormLoader() {
  const categories = await getCategoryTree(CATEGORY_TYPE.POST)
  return <PostForm categories={categories} />
}

export default function NewPostPage() {
  return (
    <>
      <AdminPageHeader
        title="新增文章"
        description="撰寫完成後可先儲存草稿，確認無誤再正式發布"
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
        <NewPostFormLoader />
      </Suspense>
    </>
  )
}
