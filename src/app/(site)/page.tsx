import { Suspense } from "react"

import { FeaturedProjects, FeaturedProjectsSkeleton } from "@/components/home/featured-projects"
import { HeroSection } from "@/components/home/hero-section"
import { HomeSection } from "@/components/home/home-section"
import { LatestPosts, LatestPostsSkeleton } from "@/components/home/latest-posts"
import { ROUTES, sectionPath } from "@/config/routes"
import { getSections } from "@/lib/data/sections"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata({ path: ROUTES.HOME })

const DEFAULT_SECTION_DESCRIPTION = "最新發布的內容。"

// Hero 與各區塊標題屬於靜態外殼（區塊清單有 "use cache"），文章查詢各自包在 Suspense 中並行串流，互不阻塞
// 每個內容區塊各自一段「最新文章」，後台新增區塊後首頁會自動出現
export default async function HomePage() {
  const sections = await getSections()

  return (
    <>
      <HeroSection primarySection={sections[0] ?? null} />
      {sections.map((section) => (
        <HomeSection
          key={section.id}
          id={`latest-${section.slug}`}
          title={`最新${section.name}`}
          description={section.description ?? DEFAULT_SECTION_DESCRIPTION}
          moreHref={sectionPath(section.slug)}
          moreLabel={`所有${section.name}`}
        >
          <Suspense fallback={<LatestPostsSkeleton />}>
            <LatestPosts section={section} />
          </Suspense>
        </HomeSection>
      ))}
      <div className="border-t border-border/60 bg-muted/30">
        <HomeSection
          id="featured-projects"
          title="精選專案"
          description="從需求分析到上線維運，親手打造的代表作品。"
          moreHref={ROUTES.PROJECTS}
          moreLabel="完整作品集"
        >
          <Suspense fallback={<FeaturedProjectsSkeleton />}>
            <FeaturedProjects />
          </Suspense>
        </HomeSection>
      </div>
    </>
  )
}
