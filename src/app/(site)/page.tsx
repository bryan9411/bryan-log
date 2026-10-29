import { Suspense } from "react"
import type { Route } from "next"

import { FeaturedProjects, FeaturedProjectsSkeleton } from "@/components/home/featured-projects"
import { HeroSection, type HeroAction } from "@/components/home/hero-section"
import { HomeSection } from "@/components/home/home-section"
import { LatestPosts, LatestPostsSkeleton } from "@/components/home/latest-posts"
import { LatestPostsFeed, LatestPostsFeedSkeleton } from "@/components/home/latest-posts-feed"
import { SectionCards, SectionCardsSkeleton } from "@/components/home/section-cards"
import { ROUTES, sectionPath } from "@/config/routes"
import { getSections, type Section } from "@/lib/data/sections"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata({ path: ROUTES.HOME })

const DEFAULT_SECTION_DESCRIPTION = "最新發布的內容。"

const LATEST_FEED_ID = "latest-posts"

function getHeroAction(sections: Section[]): HeroAction | null {
  const [firstSection] = sections
  if (!firstSection) return null
  if (sections.length === 1) {
    return { href: sectionPath(firstSection.slug), label: `閱讀${firstSection.name}` }
  }
  return { href: `${ROUTES.HOME}#${LATEST_FEED_ID}` as Route, label: "閱讀最新文章" }
}

// 只有一個區塊時沿用該區塊的名稱與列表頁，首頁看起來就是單純的部落格
function renderSingleSection(section: Section) {
  return (
    <HomeSection
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
  )
}

// 多個區塊時合併成一段最新文章（可依區塊切換）加上區塊導覽卡，首頁長度不會隨區塊數量增加
function renderMultipleSections(sections: Section[]) {
  return (
    <>
      <HomeSection
        id={LATEST_FEED_ID}
        title="最新文章"
        description="所有區塊的最新內容，依發布時間排序。"
        moreHref={ROUTES.ARCHIVES}
        moreLabel="所有文章"
      >
        <Suspense fallback={<LatestPostsFeedSkeleton />}>
          <LatestPostsFeed sections={sections} />
        </Suspense>
      </HomeSection>
      <div className="border-t border-border/60">
        <HomeSection
          id="explore-sections"
          title="探索主題"
          description="依主題瀏覽，每個區塊都有獨立的文章列表。"
        >
          <Suspense fallback={<SectionCardsSkeleton count={sections.length} />}>
            <SectionCards sections={sections} />
          </Suspense>
        </HomeSection>
      </div>
    </>
  )
}

// Hero 與各區塊標題屬於靜態外殼（區塊清單有 "use cache"），文章查詢各自包在 Suspense 中並行串流，互不阻塞
export default async function HomePage() {
  const sections = await getSections()

  const maybeRenderSections = () => {
    if (sections.length === 0) return null
    if (sections.length === 1) return renderSingleSection(sections[0])
    return renderMultipleSections(sections)
  }

  return (
    <>
      <HeroSection primaryAction={getHeroAction(sections)} />
      {maybeRenderSections()}
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
