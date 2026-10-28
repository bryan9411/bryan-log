import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { ArrowLeftIcon, LayersIcon } from "lucide-react"

import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { EmptyState } from "@/components/empty-state"
import { PostForm } from "@/components/admin/posts/post-form"
import { PostFormSkeleton } from "@/components/admin/posts/post-form-skeleton"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/config/routes"
import { getCategoryTreesBySection } from "@/lib/data/categories"
import { getSections } from "@/lib/data/sections"

export const metadata: Metadata = {
  title: "新增文章",
}

async function NewPostFormLoader() {
  const [sections, categoriesBySection] = await Promise.all([
    getSections(),
    getCategoryTreesBySection(),
  ])

  if (sections.length === 0) return <NoSectionState />

  return <PostForm sections={sections} categoriesBySection={categoriesBySection} />
}

function NoSectionState() {
  return (
    <EmptyState
      icon={LayersIcon}
      title="尚未建立內容區塊"
      description="每篇文章都必須屬於一個區塊，請先到「文章分類」新增區塊，例如「技術文章」。"
    >
      <Button asChild>
        <Link href={ROUTES.ADMIN_POST_CATEGORIES}>前往文章分類</Link>
      </Button>
    </EmptyState>
  )
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
