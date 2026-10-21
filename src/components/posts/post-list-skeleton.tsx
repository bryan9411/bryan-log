import { Skeleton } from "@/components/ui/skeleton"

type PostListSkeletonProps = {
  count: number
}

// 骨架屏的排版和實際列表一致，串流替換時版面不會跳動
export function PostListSkeleton({ count }: PostListSkeletonProps) {
  return (
    <ul aria-hidden className="-mx-4 flex flex-col divide-y divide-border/60 sm:-mx-5">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="flex flex-col gap-3 px-4 py-5 sm:px-5">
          <div className="flex gap-4">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </li>
      ))}
    </ul>
  )
}
