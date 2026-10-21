import Link from "next/link"
import { Suspense } from "react"
import { ArrowUpRightIcon, LogOutIcon } from "lucide-react"

import { AdminNavLinks } from "@/components/admin/admin-nav-links"
import { SubmitButton } from "@/components/forms/submit-button"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Skeleton } from "@/components/ui/skeleton"
import { ROUTES } from "@/config/routes"
import { siteConfig } from "@/config/site"
import { logoutAction } from "@/lib/actions/auth"
import { getAdminUser } from "@/lib/auth/session"

async function AdminUserEmail() {
  const user = await getAdminUser()

  return (
    <p className="truncate text-xs text-muted-foreground" title={user?.email ?? undefined}>
      {user?.email ?? "未知使用者"}
    </p>
  )
}

export function AdminSidebar() {
  const renderBrand = () => (
    <div className="flex items-center justify-between gap-2 md:px-3">
      <Link href={ROUTES.ADMIN_DASHBOARD} className="font-semibold tracking-tight">
        {siteConfig.name}
        <span className="ml-1.5 text-xs font-normal text-muted-foreground">管理後台</span>
      </Link>
      <ThemeToggle />
    </div>
  )

  const renderFooter = () => (
    <div className="flex items-center gap-1 md:flex-col md:items-stretch md:gap-2 md:border-t md:pt-4">
      <div className="hidden px-3 md:block">
        <Suspense fallback={<Skeleton className="h-4 w-32" />}>
          <AdminUserEmail />
        </Suspense>
      </div>
      <Link
        href={ROUTES.HOME}
        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ArrowUpRightIcon className="size-4" aria-hidden />
        回前台
      </Link>
      <form action={logoutAction}>
        <SubmitButton
          pendingText="登出中…"
          variant="ghost"
          className="w-full justify-start gap-2.5 px-3 font-normal text-muted-foreground"
        >
          <LogOutIcon aria-hidden />
          登出
        </SubmitButton>
      </form>
    </div>
  )

  return (
    <aside className="flex flex-col gap-4 border-b bg-background p-4 md:sticky md:top-0 md:h-svh md:w-60 md:shrink-0 md:border-r md:border-b-0">
      {renderBrand()}
      <div className="flex-1">
        <AdminNavLinks />
      </div>
      {renderFooter()}
    </aside>
  )
}
