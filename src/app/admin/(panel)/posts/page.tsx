import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { PlusIcon } from "lucide-react"

import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { PostListNavigationProvider } from "@/components/admin/posts/post-list-navigation"
import { PostsToolbar, PostsToolbarSkeleton } from "@/components/admin/posts/posts-toolbar"
import { PostsTable, PostsTableSkeleton } from "@/components/admin/posts/posts-table"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/config/routes"

export const metadata: Metadata = {
  title: "文章管理",
}

export default function AdminPostsPage({ searchParams }: PageProps<"/admin/posts">) {
  return (
    <>
      <AdminPageHeader
        title="文章管理"
        description="撰寫、編輯與發布技術文章"
        actions={
          <Button asChild size="lg">
            <Link href={ROUTES.ADMIN_POST_NEW}>
              <PlusIcon aria-hidden />
              新增文章
            </Link>
          </Button>
        }
      />
      {/* 搜尋列與表格分屬不同 Suspense：切換條件時搜尋框保持掛載，輸入不會中斷 */}
      <PostListNavigationProvider>
        <div className="grid gap-4">
          <Suspense fallback={<PostsToolbarSkeleton />}>
            <PostsToolbar />
          </Suspense>
          <Suspense fallback={<PostsTableSkeleton />}>
            <PostsTable searchParams={searchParams} />
          </Suspense>
        </div>
      </PostListNavigationProvider>
    </>
  )
}
