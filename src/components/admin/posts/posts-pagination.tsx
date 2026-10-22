"use client"

import Link from "next/link"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { usePostListNavigation } from "@/components/admin/posts/post-list-navigation"
import { Button } from "@/components/ui/button"
import { adminPostListRoute } from "@/config/routes"
import { ADMIN_POSTS_PAGE_SIZE, type AdminPostListParams } from "@/lib/validations/admin-post-list"

type PostsPaginationProps = {
  params: AdminPostListParams
  total: number
  pageCount: number
}

export function PostsPagination({ params, total, pageCount }: PostsPaginationProps) {
  const { navigate } = usePostListNavigation()

  const { page } = params
  const rangeStart = total === 0 ? 0 : (page - 1) * ADMIN_POSTS_PAGE_SIZE + 1
  const rangeEnd = Math.min(page * ADMIN_POSTS_PAGE_SIZE, total)

  // 保留 href 讓中鍵／新分頁開啟仍可運作；一般點擊則走共用 transition，列表切換時不閃爍
  const renderPageLink = (targetPage: number, content: React.ReactNode) => {
    const isDisabled = targetPage < 1 || targetPage > pageCount
    const target = { ...params, page: targetPage }

    if (isDisabled) {
      return (
        <Button variant="outline" size="sm" disabled>
          {content}
        </Button>
      )
    }

    return (
      <Button asChild variant="outline" size="sm">
        <Link
          href={adminPostListRoute(target)}
          scroll={false}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
            event.preventDefault()
            navigate(target)
          }}
        >
          {content}
        </Link>
      </Button>
    )
  }

  return (
    <nav
      aria-label="文章列表分頁"
      className="flex flex-col gap-3 border-t px-5 py-3.5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="tabular-nums">
        共 {total.toLocaleString("zh-TW")} 篇文章，顯示第 {rangeStart}–{rangeEnd} 篇
      </p>
      <div className="flex items-center gap-2">
        {renderPageLink(
          page - 1,
          <>
            <ChevronLeftIcon data-icon="inline-start" aria-hidden />
            上一頁
          </>,
        )}
        <span className="min-w-20 text-center text-foreground tabular-nums" aria-current="page">
          第 {page} / {pageCount} 頁
        </span>
        {renderPageLink(
          page + 1,
          <>
            下一頁
            <ChevronRightIcon data-icon="inline-end" aria-hidden />
          </>,
        )}
      </div>
    </nav>
  )
}
