import { Skeleton } from "@/components/ui/skeleton"

const SKELETON_ROWS = 6

// 文章分類與專案分類頁共用的載入骨架
export function CategoriesSkeleton({ hasTabs = false }: { hasTabs?: boolean }) {
  return (
    <div aria-hidden className="grid gap-4">
      {hasTabs && <Skeleton className="h-10 w-72 rounded-xl" />}
      <div className="flex justify-between">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="divide-y rounded-xl border bg-background">
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <div key={index} className="flex items-center gap-4 px-4 py-4">
            <Skeleton className="size-4" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="ml-auto h-5 w-24 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
