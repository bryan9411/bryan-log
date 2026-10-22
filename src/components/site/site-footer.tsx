import Link from "next/link"
import { cacheLife } from "next/cache"

import { ExternalLink } from "@/components/site/external-link"
import { GithubIcon } from "@/components/site/github-icon"
import { SiteContainer } from "@/components/site/site-container"
import { ROUTES } from "@/config/routes"
import { SITE_NAV_ITEMS } from "@/config/site-nav"
import { siteConfig } from "@/config/site"

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

export function SiteFooter() {
  const renderNavLinks = () => (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
      {SITE_NAV_ITEMS.map(({ href, label }) => (
        <li key={href}>
          <Link
            href={href}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            {label}
          </Link>
        </li>
      ))}
    </ul>
  )

  const renderGithubLink = () => (
    <ExternalLink
      href={siteConfig.githubUrl}
      aria-label="GitHub"
      title="GitHub"
      className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <GithubIcon className="size-4.5" />
    </ExternalLink>
  )

  return (
    <footer className="mt-auto border-t border-border/60">
      <SiteContainer className="flex flex-col gap-8 py-10">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
          <div className="flex max-w-sm flex-col gap-2">
            <Link href={ROUTES.HOME} className="font-semibold tracking-tight">
              {siteConfig.name}
            </Link>
            <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
              {siteConfig.description}
            </p>
          </div>
          <nav aria-label="頁尾導覽" className="flex flex-col gap-4 sm:items-end">
            {renderNavLinks()}
            {renderGithubLink()}
          </nav>
        </div>
        <p className="border-t border-border/60 pt-6 text-xs text-muted-foreground">
          © <CopyrightYears /> {siteConfig.name} 版權所有
        </p>
      </SiteContainer>
    </footer>
  )
}
