"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Suspense } from "react"

import { SITE_NAV_ITEMS } from "@/config/site-nav"
import { isActiveHref } from "@/lib/navigation"
import { cn } from "@/lib/utils"

const NAV_ORIENTATION = {
  HORIZONTAL: "horizontal",
  VERTICAL: "vertical",
} as const

type NavOrientation = (typeof NAV_ORIENTATION)[keyof typeof NAV_ORIENTATION]

type SiteNavLinksProps = {
  orientation?: NavOrientation
  onNavigate?: () => void
}

type SiteNavListProps = SiteNavLinksProps & {
  pathname: string | null
}

function SiteNavList({
  pathname,
  orientation = NAV_ORIENTATION.HORIZONTAL,
  onNavigate,
}: SiteNavListProps) {
  const isVertical = orientation === NAV_ORIENTATION.VERTICAL

  return (
    <ul className={cn("flex gap-1", isVertical && "flex-col")}>
      {SITE_NAV_ITEMS.map(({ href, label }) => {
        const isActive = isActiveHref(pathname, href)

        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
                isVertical && "py-2.5 text-base hover:bg-muted",
                isActive && "font-medium text-foreground",
              )}
            >
              {label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function ActiveSiteNavList(props: SiteNavLinksProps) {
  const pathname = usePathname()
  return <SiteNavList pathname={pathname} {...props} />
}

// 文章內頁等動態路由的路徑要到請求時才知道，先輸出不含選取狀態的導覽列，避免阻塞靜態外殼
export function SiteNavLinks(props: SiteNavLinksProps) {
  return (
    <Suspense fallback={<SiteNavList pathname={null} {...props} />}>
      <ActiveSiteNavList {...props} />
    </Suspense>
  )
}
