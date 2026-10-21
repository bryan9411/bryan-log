import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { ArrowRightIcon } from "lucide-react"

import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { StatCard, StatCardSkeleton } from "@/components/admin/stat-card"
import { ADMIN_NAV_ITEMS } from "@/config/admin-nav"
import { ROUTES } from "@/config/routes"
import { getContentStats } from "@/lib/data/admin-stats"

export const metadata: Metadata = {
  title: "管理儀表板",
}

const STAT_SKELETON_COUNT = 4

const QUICK_LINK_DESCRIPTION: Partial<Record<string, string>> = {
  [ROUTES.ADMIN_POSTS]: "撰寫、編輯與發布技術文章",
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

export default function AdminDashboardPage() {
  const quickLinks = ADMIN_NAV_ITEMS.filter((item) => QUICK_LINK_DESCRIPTION[item.href])

  const renderStatsSkeleton = () =>
    Array.from({ length: STAT_SKELETON_COUNT }, (_, index) => <StatCardSkeleton key={index} />)

  const renderQuickLinks = () => (
    <section className="grid gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">快速操作</h2>
      <div className="grid gap-3 sm:grid-cols-3">
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
      {renderQuickLinks()}
    </>
  )
}
