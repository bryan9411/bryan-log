import type { Route } from "next"

import { SectionHeading } from "@/components/home/section-heading"
import { SiteContainer } from "@/components/site/site-container"

type HomeSectionProps = {
  id: string
  title: string
  description: string
  moreHref?: Route
  moreLabel?: string
  children: React.ReactNode
}

// 標題列屬於靜態外殼會立即輸出，只有 children 中的資料區塊需要等待串流
export function HomeSection({ id, children, ...headingProps }: HomeSectionProps) {
  const headingId = `${id}-heading`

  return (
    <section id={id} aria-labelledby={headingId} className="py-14 sm:py-16">
      <SiteContainer className="flex flex-col gap-8">
        <SectionHeading id={headingId} {...headingProps} />
        {children}
      </SiteContainer>
    </section>
  )
}
