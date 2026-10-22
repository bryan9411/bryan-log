"use client"

import { useRouter } from "next/navigation"
import { createContext, use, useTransition } from "react"

import { adminPostListRoute } from "@/config/routes"
import type { AdminPostListParams } from "@/lib/validations/admin-post-list"

type PostListNavigation = {
  isPending: boolean
  navigate: (params: AdminPostListParams) => void
}

const PostListNavigationContext = createContext<PostListNavigation | null>(null)

// 搜尋、篩選與分頁共用同一個 transition：切換期間保留舊列表並降低透明度，而不是閃回骨架畫面
export function PostListNavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const navigate = (params: AdminPostListParams) => {
    startTransition(() => router.push(adminPostListRoute(params), { scroll: false }))
  }

  return (
    <PostListNavigationContext value={{ isPending, navigate }}>
      {children}
    </PostListNavigationContext>
  )
}

export function usePostListNavigation() {
  const context = use(PostListNavigationContext)
  if (!context) throw new Error("usePostListNavigation 必須在 PostListNavigationProvider 內使用")
  return context
}
