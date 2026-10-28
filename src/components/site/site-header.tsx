import Link from "next/link"

import { ThemeToggle } from "@/components/layout/theme-toggle"
import { SearchCommand } from "@/components/search/search-command"
import { MobileNav } from "@/components/site/mobile-nav"
import { SiteContainer } from "@/components/site/site-container"
import { SiteNavLinks } from "@/components/site/site-nav-links"
import { ROUTES } from "@/config/routes"
import { siteConfig } from "@/config/site"
import { buildSiteNavItems } from "@/config/site-nav"
import { getSections } from "@/lib/data/sections"

// 導覽項目來自後台設定的內容區塊；查詢有 "use cache"，會一併預渲染進靜態外殼
export async function SiteHeader() {
  const navItems = buildSiteNavItems(await getSections())

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/70">
      <SiteContainer className="flex h-16 items-center justify-between gap-4">
        <Link href={ROUTES.HOME} className="font-semibold tracking-tight">
          {siteConfig.name}
        </Link>
        <div className="flex items-center gap-1">
          <nav aria-label="主選單" className="hidden md:block">
            <SiteNavLinks items={navItems} />
          </nav>
          <SearchCommand />
          <ThemeToggle contentClassName="site-theme" />
          <MobileNav items={navItems} />
        </div>
      </SiteContainer>
    </header>
  )
}
