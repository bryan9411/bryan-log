import { Skeleton } from "@/components/ui/skeleton"

const CHIP_WIDTHS = ["w-16", "w-24", "w-20", "w-28", "w-20"]

export function CategoryFilterSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {CHIP_WIDTHS.map((width, index) => (
          <Skeleton key={index} className={`h-8 rounded-full ${width}`} />
        ))}
      </div>
      <Skeleton className="h-5 w-24" />
    </div>
  )
}
