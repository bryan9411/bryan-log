import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { PlusIcon } from "lucide-react"

import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { PostsTable, PostsTableSkeleton } from "@/components/admin/posts/posts-table"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/config/routes"

export const metadata: Metadata = {
  title: "文章管理",
}

export default function AdminPostsPage() {
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
      <Suspense fallback={<PostsTableSkeleton />}>
        <PostsTable />
      </Suspense>
    </>
  )
}
