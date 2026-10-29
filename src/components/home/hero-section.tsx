import Link from "next/link"
import type { Route } from "next"
import { ArrowRightIcon } from "lucide-react"

import { SiteContainer } from "@/components/site/site-container"
import { badgeVariants } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/config/routes"
import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"

export type HeroAction = {
  href: Route
  label: string
}

type HeroSectionProps = {
  // 主要行動按鈕；尚未建立任何區塊時不顯示
  primaryAction: HeroAction | null
}

// 純靜態內容：建置時即預渲染進 HTML 外殼，首次載入不需等待任何資料
export function HeroSection({ primaryAction }: HeroSectionProps) {
  const { eyebrow, headline, intro, skills } = siteConfig.hero

  const renderSkills = () => (
    <ul aria-label="核心技術" className="flex flex-wrap gap-2">
      {skills.map((skill) => (
        <li
          key={skill}
          className={cn(badgeVariants({ variant: "tag" }), "h-7 px-3 font-mono font-normal")}
        >
          {skill}
        </li>
      ))}
    </ul>
  )

  const maybeRenderSectionAction = () => {
    if (!primaryAction) return null

    return (
      <Button asChild size="lg" className="h-10 px-4">
        <Link href={primaryAction.href}>
          {primaryAction.label}
          <ArrowRightIcon data-icon="inline-end" aria-hidden />
        </Link>
      </Button>
    )
  }

  const renderActions = () => (
    <div className="flex flex-wrap gap-3">
      {maybeRenderSectionAction()}
      <Button asChild size="lg" variant="outline" className="h-10 px-4">
        <Link href={ROUTES.PROJECTS}>瀏覽作品集</Link>
      </Button>
    </div>
  )

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden border-b border-border/60"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-muted),transparent_65%)]"
      />
      <SiteContainer className="relative flex flex-col gap-7 py-20 sm:py-28">
        <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>
        <h1
          id="hero-heading"
          className="max-w-3xl text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl sm:leading-tight"
        >
          {headline}
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
          {intro}
        </p>
        {renderSkills()}
        {renderActions()}
      </SiteContainer>
    </section>
  )
}
