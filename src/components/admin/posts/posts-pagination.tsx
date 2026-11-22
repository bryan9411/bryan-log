"use client"

import { AdminPagination } from "@/components/admin/admin-pagination"
import { usePostListNavigation } from "@/components/admin/posts/post-list-navigation"
import { adminPostListRoute } from "@/config/admin-routes"
import { ADMIN_POSTS_PAGE_SIZE, type AdminPostListParams } from "@/lib/validations/admin-post-list"

type PostsPaginationProps = {
  params: AdminPostListParams
  total: number
  pageCount: number
}

export function PostsPagination({ params, total, pageCount }: PostsPaginationProps) {
  const { navigate } = usePostListNavigation()

  return (
    <AdminPagination
      label="文章列表分頁"
      unit="篇文章"
      counter="篇"
      page={params.page}
      pageSize={ADMIN_POSTS_PAGE_SIZE}
      total={total}
      pageCount={pageCount}
      hrefFor={(page) => adminPostListRoute({ ...params, page })}
      onNavigate={(page) => navigate({ ...params, page })}
    />
  )
}
