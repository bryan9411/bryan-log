"use client"

import dynamic from "next/dynamic"

import { Skeleton } from "@/components/ui/skeleton"

// Tiptap 依賴 DOM 與 window，以 ssr: false 確保只在瀏覽器載入，同時把編輯器拆成獨立 chunk 延遲下載
export const LazyTiptapEditor = dynamic(
  () => import("@/components/editor/tiptap-editor").then((module) => module.TiptapEditor),
  {
    ssr: false,
    loading: () => (
      <div
        className="overflow-hidden rounded-xl border bg-background"
        aria-busy
        aria-label="編輯器載入中"
      >
        <div className="border-b px-2 py-1.5">
          <Skeleton className="h-8 w-full max-w-xl" />
        </div>
        <div className="grid gap-3 px-8 py-6">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-5/6" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    ),
  },
)
