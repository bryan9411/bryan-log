import Link from "next/link"
import { ArrowRightIcon, CircleAlertIcon } from "lucide-react"

import { LazyCategoryDonutChart, LazyTopPostsChart } from "@/components/admin/dashboard/lazy-charts"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ROUTES } from "@/config/routes"
import {
  CATEGORY_COUNT_UNIT,
  CATEGORY_TAB_LABEL,
  categoryTypeSchema,
  type CategoryType,
} from "@/lib/constants/content"
import { getCategoryDistribution, getTopViewedPosts } from "@/lib/data/admin-stats"
import { formatBytes } from "@/lib/format"
import { getStorageUsage, type StorageUsage } from "@/lib/storage/unreferenced-cleaner"
import { cn } from "@/lib/utils"

const TOP_POSTS_LIMIT = 8

function EmptyChartMessage({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
      {children}
    </p>
  )
}

export async function TopPostsCard() {
  const posts = await getTopViewedPosts(TOP_POSTS_LIMIT)

  const renderChart = () => {
    if (posts.length === 0)
      return <EmptyChartMessage>已發布文章目前還沒有瀏覽紀錄</EmptyChartMessage>
    return <LazyTopPostsChart posts={posts} />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>熱門文章排行</CardTitle>
        <CardDescription>已發布文章中瀏覽數最高的前 {TOP_POSTS_LIMIT} 篇</CardDescription>
      </CardHeader>
      <CardContent>{renderChart()}</CardContent>
    </Card>
  )
}

export async function CategoryShareCards() {
  const distribution = await getCategoryDistribution()

  const renderCard = (type: CategoryType) => {
    const shares = distribution[type]

    const renderChart = () => {
      if (shares.length === 0) return <EmptyChartMessage>尚無任何內容</EmptyChartMessage>
      return <LazyCategoryDonutChart shares={shares} unit={CATEGORY_COUNT_UNIT[type]} />
    }

    return (
      <Card key={type}>
        <CardHeader>
          <CardTitle>{CATEGORY_TAB_LABEL[type]}占比</CardTitle>
          <CardDescription>依主分類彙總（含子分類與草稿）</CardDescription>
        </CardHeader>
        <CardContent>{renderChart()}</CardContent>
      </Card>
    )
  }

  return <>{categoryTypeSchema.options.map(renderCard)}</>
}

export async function StorageUsageCard() {
  let usage: StorageUsage | null = null
  let errorMessage: string | null = null

  try {
    usage = await getStorageUsage()
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "未知錯誤"
  }

  const renderContent = () => {
    if (!usage) {
      return (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>儲存空間讀取失敗：{errorMessage}</span>
        </div>
      )
    }

    return (
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-3xl font-semibold tabular-nums">{formatBytes(usage.totalBytes)}</p>
        <p className="text-sm text-muted-foreground">共 {usage.totalFiles} 個檔案</p>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>儲存空間</CardTitle>
        <CardDescription>已上傳的圖片總用量；未引用的檔案可到空間清理頁掃描</CardDescription>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href={ROUTES.ADMIN_STORAGE}>
              前往清理
              <ArrowRightIcon data-icon="inline-end" aria-hidden />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  )
}

export function ChartCardSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-80 rounded-xl", className)} />
}
