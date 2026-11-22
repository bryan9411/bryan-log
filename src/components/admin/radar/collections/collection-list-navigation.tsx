"use client"

import { useRouter } from "next/navigation"
import { createContext, use, useTransition } from "react"

import { adminRadarCollectionListRoute } from "@/config/admin-routes"
import type { AdminRadarCollectionListParams } from "@/lib/validations/radar-collection"

type CollectionListNavigation = {
  isPending: boolean
  navigate: (params: AdminRadarCollectionListParams) => void
}

const CollectionListNavigationContext = createContext<CollectionListNavigation | null>(null)

// 狀態分頁、篩選與分頁共用同一個 transition：切換期間保留舊列表並降低透明度，而不是閃回骨架畫面
export function CollectionListNavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const navigate = (params: AdminRadarCollectionListParams) => {
    startTransition(() => router.push(adminRadarCollectionListRoute(params), { scroll: false }))
  }

  return (
    <CollectionListNavigationContext value={{ isPending, navigate }}>
      {children}
    </CollectionListNavigationContext>
  )
}

export function useCollectionListNavigation() {
  const context = use(CollectionListNavigationContext)
  if (!context) {
    throw new Error("useCollectionListNavigation 必須在 CollectionListNavigationProvider 內使用")
  }
  return context
}
