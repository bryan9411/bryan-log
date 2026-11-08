"use client"

import dynamic from "next/dynamic"

import { Skeleton } from "@/components/ui/skeleton"

const renderChartSkeleton = () => <Skeleton className="h-64 w-full rounded-lg" />

// recharts 體積大，拆成獨立 chunk 在瀏覽器端載入，儀表板的數字與版面不必等它下載
export const LazyTopPostsChart = dynamic(
  () =>
    import("@/components/admin/dashboard/top-posts-chart").then((module) => module.TopPostsChart),
  { ssr: false, loading: renderChartSkeleton },
)

export const LazyCategoryDonutChart = dynamic(
  () =>
    import("@/components/admin/dashboard/category-donut-chart").then(
      (module) => module.CategoryDonutChart,
    ),
  { ssr: false, loading: renderChartSkeleton },
)

export const LazyWebVitalsTrendChart = dynamic(
  () =>
    import("@/components/admin/dashboard/web-vitals-trend-chart").then(
      (module) => module.WebVitalsTrendChart,
    ),
  { ssr: false, loading: renderChartSkeleton },
)
