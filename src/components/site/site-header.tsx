import Link from "next/link"

import { ThemeToggle } from "@/components/layout/theme-toggle"
import { MobileNav } from "@/components/site/mobile-nav"
import { SiteContainer } from "@/components/site/site-container"
import { SiteNavLinks } from "@/components/site/site-nav-links"
import { ROUTES } from "@/config/routes"
import { siteConfig } from "@/config/site"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/70">
      <SiteContainer className="flex h-16 items-center justify-between gap-4">
        <Link href={ROUTES.HOME} className="font-semibold tracking-tight">
          {siteConfig.name}
        </Link>
        <div className="flex items-center gap-1">
          <nav aria-label="主選單" className="hidden md:block">
            <SiteNavLinks />
          </nav>
          <ThemeToggle />
          <MobileNav />
        </div>
      </SiteContainer>
    </header>
  )
}
