"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Suspense } from "react"

import { ADMIN_NAV_GROUPS, type AdminNavItem } from "@/config/admin-nav"
import { isActiveHref } from "@/lib/navigation"
import { cn } from "@/lib/utils"

function AdminNavList({ pathname }: { pathname: string | null }) {
  const renderItem = ({ href, label, icon: Icon }: AdminNavItem) => {
    const isActive = isActiveHref(pathname, href)

    return (
      <Link
        key={href}
        href={href}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors",
          "hover:bg-muted hover:text-foreground",
          isActive && "bg-muted font-medium text-foreground",
        )}
      >
        <Icon className="size-4" aria-hidden />
        {label}
      </Link>
    )
  }

  const maybeRenderGroupLabel = (label: string | null) => {
    if (!label) return null
    // 手機版導覽列為橫向捲動，群組標題只在桌面版側邊欄顯示
    return (
      <p className="hidden px-3 pt-3 pb-1 text-xs font-medium text-muted-foreground/80 md:block">
        {label}
      </p>
    )
  }

  return (
    <nav aria-label="後台導覽" className="flex gap-1 overflow-x-auto md:flex-col">
      {ADMIN_NAV_GROUPS.map(({ label, items }, index) => (
        <div key={label ?? index} className="contents md:flex md:flex-col md:gap-1">
          {maybeRenderGroupLabel(label)}
          {items.map(renderItem)}
        </div>
      ))}
    </nav>
  )
}

function ActiveAdminNavList() {
  const pathname = usePathname()
  return <AdminNavList pathname={pathname} />
}

// 動態路由（例如 /admin/posts/[id]/edit）的路徑只有在請求時才知道
// 預渲染時先輸出不含選取狀態的導覽列，路徑可用後再串流替換，避免阻塞整頁預渲染
export function AdminNavLinks() {
  return (
    <Suspense fallback={<AdminNavList pathname={null} />}>
      <ActiveAdminNavList />
    </Suspense>
  )
}
