import { notFound } from "next/navigation"

import { SectionHeading } from "@/components/home/section-heading"
import { GithubRankCard } from "@/components/radar/github-rank-card"
import { HnRankingList } from "@/components/radar/hn-ranking"
import { PageHeader } from "@/components/site/page-header"
import { SiteContainer } from "@/components/site/site-container"
import { RADAR_MODULE, RADAR_OVERVIEW_SIZE, RADAR_OVERVIEW_DESCRIPTION } from "@/config/radar"
import { ROUTES } from "@/config/routes"
import {
  getGithubWeeklyRanking,
  getHnWeeklyRanking,
  getPublicRadarModules,
  type PublicRadarModule,
} from "@/lib/data/public-radar"
import { formatDateTime } from "@/lib/format"
import { createRadarPageMetadata } from "@/lib/radar/metadata"

// 前台以「週榜」稱呼雷達模組，網址與程式內部仍沿用 radar
const TITLE = "技術週榜"

export const metadata = createRadarPageMetadata({
  path: ROUTES.RADAR,
  title: TITLE,
  description: RADAR_OVERVIEW_DESCRIPTION,
})

function EmptyRanking() {
  return (
    <p className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
      資料同步中，稍後再回來看看。
    </p>
  )
}

async function GithubPreview() {
  const { items } = await getGithubWeeklyRanking()
  if (items.length === 0) return <EmptyRanking />

  return (
    <ol aria-label="GitHub 週榜" className="-mx-4 sm:-mx-5">
      {items.slice(0, RADAR_OVERVIEW_SIZE).map((item) => (
        <li key={item.id}>
          <GithubRankCard item={item} />
        </li>
      ))}
    </ol>
  )
}

async function HnPreview() {
  const { top } = await getHnWeeklyRanking()
  return <HnRankingList items={top.slice(0, RADAR_OVERVIEW_SIZE)} />
}

const PREVIEWS = {
  [RADAR_MODULE.GITHUB]: GithubPreview,
  [RADAR_MODULE.HN]: HnPreview,
}

function renderModule(radarModule: PublicRadarModule) {
  const Preview = PREVIEWS[radarModule.key]
  const syncedAt = radarModule.lastSyncedAt
    ? `最後同步：${formatDateTime(radarModule.lastSyncedAt)}`
    : "尚未同步"

  return (
    <section
      key={radarModule.key}
      aria-labelledby={`radar-${radarModule.key}`}
      className="flex flex-col gap-4"
    >
      <SectionHeading
        id={`radar-${radarModule.key}`}
        title={radarModule.label}
        description={`${radarModule.description}${syncedAt}`}
        moreHref={radarModule.href}
        moreLabel="看完整榜單"
      />
      <Preview />
    </section>
  )
}

// 每個公開模組顯示前 5 名；沒有任何公開模組時整個雷達視為不存在
export default async function RadarPage() {
  const modules = await getPublicRadarModules()

  if (modules.length === 0) notFound()

  return (
    <SiteContainer className="flex flex-col gap-14 py-12 sm:py-16">
      <PageHeader title={TITLE} description={RADAR_OVERVIEW_DESCRIPTION} />
      {modules.map(renderModule)}
    </SiteContainer>
  )
}
