"use client"

import Link from "next/link"
import type { Route } from "next"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

type AdminPaginationProps = {
  // 例如「文章列表分頁」
  label: string
  // 總筆數的單位與計數詞，例如「篇文章」「篇」、「筆收藏」「筆」
  unit: string
  counter: string
  page: number
  pageSize: number
  total: number
  pageCount: number
  hrefFor: (page: number) => Route
  onNavigate: (page: number) => void
}

// 後台列表共用的分頁列：保留 href 讓中鍵／新分頁開啟仍可運作；一般點擊交給列表自己的 transition，切換時不閃爍
export function AdminPagination({
  label,
  unit,
  counter,
  page,
  pageSize,
  total,
  pageCount,
  hrefFor,
  onNavigate,
}: AdminPaginationProps) {
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, total)

  const renderPageLink = (targetPage: number, content: React.ReactNode) => {
    const isDisabled = targetPage < 1 || targetPage > pageCount

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
          href={hrefFor(targetPage)}
          scroll={false}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
            event.preventDefault()
            onNavigate(targetPage)
          }}
        >
          {content}
        </Link>
      </Button>
    )
  }

  return (
    <nav
      aria-label={label}
      className="flex flex-col gap-3 border-t px-5 py-3.5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="tabular-nums">
        共 {total.toLocaleString("zh-TW")} {unit}，顯示第 {rangeStart}–{rangeEnd} {counter}
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
