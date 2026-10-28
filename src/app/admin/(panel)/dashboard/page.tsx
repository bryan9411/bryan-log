import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { ArrowRightIcon } from "lucide-react"

import { AdminPageHeader } from "@/components/admin/admin-page-header"
import {
  CategoryShareCards,
  ChartCardSkeleton,
  StorageUsageCard,
  TopPostsCard,
} from "@/components/admin/dashboard/dashboard-charts"
import { WebVitalsCard } from "@/components/admin/dashboard/web-vitals-card"
import { StatCard, StatCardSkeleton } from "@/components/admin/stat-card"
import { ADMIN_NAV_ITEMS } from "@/config/admin-nav"
import { ROUTES } from "@/config/routes"
import { WEB_VITALS_SEARCH_PARAM, webVitalsFilterSchema } from "@/lib/constants/web-vitals"
import { getContentStats } from "@/lib/data/admin-stats"

export const metadata: Metadata = {
  title: "管理儀表板",
}

const STAT_SKELETON_COUNT = 4

const QUICK_LINK_DESCRIPTION: Partial<Record<string, string>> = {
  [ROUTES.ADMIN_POSTS]: "撰寫、編輯與發布各內容區塊的文章",
  [ROUTES.ADMIN_POST_CATEGORIES]: "管理內容區塊與文章分類",
  [ROUTES.ADMIN_PROJECTS]: "維護作品集與精選專案",
  [ROUTES.ADMIN_STORAGE]: "掃描並清除未被引用的圖片",
}

async function ContentStatsGrid() {
  const stats = await getContentStats()

  return (
    <>
      <StatCard label="文章總數" value={stats.totalPosts} />
      <StatCard label="已發布" value={stats.publishedPosts} />
      <StatCard label="草稿" value={stats.draftPosts} />
      <StatCard
        label="作品集"
        value={stats.totalProjects}
        hint={`其中 ${stats.featuredProjects} 個為精選`}
      />
    </>
  )
}

type DashboardSearchParams = PageProps<"/admin/dashboard">["searchParams"]

// 篩選條件來自網址查詢參數，需在請求時讀取，因此與其他區塊一樣包在 Suspense 內串流
async function WebVitalsSection({ searchParams }: { searchParams: DashboardSearchParams }) {
  const params = await searchParams
  const filter = webVitalsFilterSchema.parse({
    range: params[WEB_VITALS_SEARCH_PARAM.RANGE],
    device: params[WEB_VITALS_SEARCH_PARAM.DEVICE],
  })

  return <WebVitalsCard filter={filter} />
}

export default function AdminDashboardPage({ searchParams }: PageProps<"/admin/dashboard">) {
  const quickLinks = ADMIN_NAV_ITEMS.filter((item) => QUICK_LINK_DESCRIPTION[item.href])

  const renderStatsSkeleton = () =>
    Array.from({ length: STAT_SKELETON_COUNT }, (_, index) => <StatCardSkeleton key={index} />)

  const renderCategorySkeleton = () => (
    <>
      <ChartCardSkeleton />
      <ChartCardSkeleton />
    </>
  )

  const renderQuickLinks = () => (
    <section className="grid gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">快速操作</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:bg-muted"
          >
            <div className="flex items-center justify-between">
              <Icon className="size-4 text-muted-foreground" aria-hidden />
              <ArrowRightIcon
                className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </div>
            <p className="font-medium">{label}</p>
            <p className="text-sm text-muted-foreground">{QUICK_LINK_DESCRIPTION[href]}</p>
          </Link>
        ))}
      </div>
    </section>
  )

  return (
    <>
      <AdminPageHeader title="管理儀表板" description="網站內容概況與常用功能" />
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="內容統計">
        <Suspense fallback={renderStatsSkeleton()}>
          <ContentStatsGrid />
        </Suspense>
      </section>
      {/* 各圖表獨立串流：儲存空間掃描較慢，不會拖住其他圖表 */}
      <section className="grid gap-4 lg:grid-cols-5" aria-label="內容分析">
        <div className="lg:col-span-3">
          <Suspense fallback={<ChartCardSkeleton className="h-96" />}>
            <TopPostsCard />
          </Suspense>
        </div>
        <div className="lg:col-span-2">
          <Suspense fallback={<ChartCardSkeleton />}>
            <StorageUsageCard />
          </Suspense>
        </div>
      </section>
      <section aria-label="效能監控">
        <Suspense fallback={<ChartCardSkeleton className="h-[40rem]" />}>
          <WebVitalsSection searchParams={searchParams} />
        </Suspense>
      </section>
      <section className="grid gap-4 md:grid-cols-2" aria-label="分類占比">
        <Suspense fallback={renderCategorySkeleton()}>
          <CategoryShareCards />
        </Suspense>
      </section>
      {renderQuickLinks()}
    </>
  )
}
