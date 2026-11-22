import { notFound } from "next/navigation"

import { GithubRanking } from "@/components/radar/github-ranking"
import { RadarHeader } from "@/components/radar/radar-header"
import {
  formatGithubPeriod,
  getAccumulatingDays,
  GITHUB_RANKING_BASIS,
} from "@/components/radar/ranking-basis"
import { SiteContainer } from "@/components/site/site-container"
import { RADAR_MODULE, RADAR_MODULE_META } from "@/config/radar"
import { getGithubWeeklyRanking, getPublicRadarModule } from "@/lib/data/public-radar"
import { createRadarPageMetadata } from "@/lib/radar/metadata"

const META = RADAR_MODULE_META[RADAR_MODULE.GITHUB]

export const metadata = createRadarPageMetadata({
  path: META.publicPath,
  title: META.label,
  description: META.description,
})

// 模組未公開時回 404，此時不查詢榜單；資料皆有 "use cache"，排程同步後以快取標籤失效
export default async function RadarGithubPage() {
  const radarModule = await getPublicRadarModule(RADAR_MODULE.GITHUB)
  if (!radarModule) notFound()

  const ranking = await getGithubWeeklyRanking()

  return (
    <SiteContainer className="flex flex-col gap-10 py-12 sm:py-16">
      <RadarHeader
        title={META.label}
        description={META.description}
        basis={GITHUB_RANKING_BASIS}
        period={formatGithubPeriod(ranking.latestDate, ranking.windowDays)}
        lastSyncedAt={radarModule.lastSyncedAt}
        accumulatingDays={getAccumulatingDays(ranking.windowDays, ranking.items.length > 0)}
      />
      <GithubRanking items={ranking.items} />
    </SiteContainer>
  )
}
