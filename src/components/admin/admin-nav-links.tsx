"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Suspense } from "react"

import { ADMIN_NAV_ITEMS } from "@/config/admin-nav"
import { isActiveHref } from "@/lib/navigation"
import { cn } from "@/lib/utils"

function AdminNavList({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="後台導覽" className="flex gap-1 overflow-x-auto md:flex-col">
      {ADMIN_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
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
      })}
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
