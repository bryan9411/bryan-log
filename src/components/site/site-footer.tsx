import Link from "next/link"
import { cacheLife } from "next/cache"
import { ArrowRightIcon } from "lucide-react"

import { SiteContainer } from "@/components/site/site-container"
import { ROUTES } from "@/config/routes"
import { siteConfig } from "@/config/site"
import { buildFooterNavGroups, buildSiteNavItems, type SiteNavGroup } from "@/config/site-nav"
import { getSections } from "@/lib/data/sections"

const FOOTER_MAX_GROUP_LINKS = 8

// Cache Components 不允許在預渲染時直接讀取目前時間，以快取函式取得年份並每天更新
async function CopyrightYears() {
  "use cache"
  cacheLife("days")

  const currentYear = new Date().getFullYear()
  const years =
    currentYear > siteConfig.launchYear
      ? `${siteConfig.launchYear}–${currentYear}`
      : `${siteConfig.launchYear}`

  return <>{years}</>
}

export async function SiteFooter() {
  const navGroups = buildFooterNavGroups(buildSiteNavItems(await getSections()))

  // 區塊很多時只列前幾個，其餘以「全部文章」連到歸檔頁，避免頁尾無限拉長
  const renderNavGroup = ({ label, items }: SiteNavGroup) => {
    const visibleItems = items.slice(0, FOOTER_MAX_GROUP_LINKS)
    const hasOverflow = items.length > FOOTER_MAX_GROUP_LINKS

    return (
      <div key={label} className="flex min-w-0 flex-col gap-3">
        <h2 className="text-sm font-medium">{label}</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {visibleItems.map(({ href, label: linkLabel }) => (
            <li key={href}>
              <Link
                href={href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {linkLabel}
              </Link>
            </li>
          ))}
          {hasOverflow ? (
            <li>
              <Link
                href={ROUTES.ARCHIVES}
                className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                全部文章
                <ArrowRightIcon className="size-3.5" aria-hidden />
              </Link>
            </li>
          ) : null}
        </ul>
      </div>
    )
  }

  return (
    <footer className="mt-auto border-t border-border/60">
      <SiteContainer className="flex flex-col gap-8 py-10">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
          <div className="flex max-w-sm flex-col gap-3">
            <Link href={ROUTES.HOME} className="font-semibold tracking-tight">
              {siteConfig.name}
            </Link>
            <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
              {siteConfig.description}
            </p>
          </div>
          <nav
            aria-label="頁尾導覽"
            className="grid grid-cols-2 gap-x-12 gap-y-8 sm:flex sm:gap-16"
          >
            {navGroups.map(renderNavGroup)}
          </nav>
        </div>
        <p className="border-t border-border/60 pt-6 text-xs text-muted-foreground">
          © <CopyrightYears /> {siteConfig.name} 版權所有
        </p>
      </SiteContainer>
    </footer>
  )
}
