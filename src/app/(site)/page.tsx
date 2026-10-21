import { Suspense } from "react"

import { FeaturedProjects, FeaturedProjectsSkeleton } from "@/components/home/featured-projects"
import { HeroSection } from "@/components/home/hero-section"
import { HomeSection } from "@/components/home/home-section"
import { LatestPosts, LatestPostsSkeleton } from "@/components/home/latest-posts"
import { ROUTES } from "@/config/routes"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata({ path: ROUTES.HOME })

// Hero 與各區塊標題屬於靜態外殼，資料庫查詢各自包在 Suspense 中並行串流，互不阻塞
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <HomeSection
        id="latest-posts"
        title="最新技術文章"
        description="實戰筆記、架構取捨與踩坑紀錄。"
        moreHref={ROUTES.POSTS}
        moreLabel="所有文章"
      >
        <Suspense fallback={<LatestPostsSkeleton />}>
          <LatestPosts />
        </Suspense>
      </HomeSection>
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
