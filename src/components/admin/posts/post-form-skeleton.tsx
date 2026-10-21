import { Skeleton } from "@/components/ui/skeleton"

export function PostFormSkeleton() {
  return (
    <div
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]"
      aria-busy
      aria-label="表單載入中"
    >
      <div className="grid content-start gap-5">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-96" />
      </div>
      <div className="grid content-start gap-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-72" />
      </div>
    </div>
  )
}
