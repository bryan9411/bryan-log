"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Suspense } from "react"

import { SiteNavDropdown } from "@/components/site/site-nav-dropdown"
import {
  isSiteNavGroup,
  type SiteNavGroup,
  type SiteNavItem,
  type SiteNavLink,
} from "@/config/site-nav"
import { isActiveHref } from "@/lib/navigation"
import { cn } from "@/lib/utils"

const NAV_ORIENTATION = {
  HORIZONTAL: "horizontal",
  VERTICAL: "vertical",
} as const

type NavOrientation = (typeof NAV_ORIENTATION)[keyof typeof NAV_ORIENTATION]

type SiteNavLinksProps = {
  items: SiteNavItem[]
  orientation?: NavOrientation
  onNavigate?: () => void
}

type SiteNavListProps = SiteNavLinksProps & {
  pathname: string | null
}

const linkClassName = (isVertical: boolean, isActive: boolean) =>
  cn(
    "block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
    isVertical && "py-2.5 text-base hover:bg-muted",
    isActive && "font-medium text-foreground",
  )

function SiteNavList({
  items,
  pathname,
  orientation = NAV_ORIENTATION.HORIZONTAL,
  onNavigate,
}: SiteNavListProps) {
  const isVertical = orientation === NAV_ORIENTATION.VERTICAL

  const renderLink = ({ href, label }: SiteNavLink) => {
    const isActive = isActiveHref(pathname, href)

    return (
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={isActive ? "page" : undefined}
        className={linkClassName(isVertical, isActive)}
      >
        {label}
      </Link>
    )
  }

  // 行動版空間是縱向的，群組直接展開成帶標題的子清單，少一次點擊
  const renderGroup = (group: SiteNavGroup) => {
    if (!isVertical) {
      return <SiteNavDropdown group={group} pathname={pathname} onNavigate={onNavigate} />
    }

    return (
      <div className="flex flex-col">
        <span className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">
          {group.label}
        </span>
        <ul className="ml-3 flex flex-col border-l border-border/60 pl-2">
          {group.items.map((link) => (
            <li key={link.href}>{renderLink(link)}</li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <ul className={cn("flex gap-1", isVertical && "flex-col")}>
      {items.map((item) =>
        isSiteNavGroup(item) ? (
          <li key={item.label}>{renderGroup(item)}</li>
        ) : (
          <li key={item.href}>{renderLink(item)}</li>
        ),
      )}
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
