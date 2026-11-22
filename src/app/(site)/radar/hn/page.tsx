import { notFound } from "next/navigation"

import { HnRanking } from "@/components/radar/hn-ranking"
import { RadarHeader } from "@/components/radar/radar-header"
import { HN_PERIOD, HN_RANKING_BASIS } from "@/components/radar/ranking-basis"
import { SiteContainer } from "@/components/site/site-container"
import { RADAR_MODULE, RADAR_MODULE_META } from "@/config/radar"
import { getHnWeeklyRanking, getPublicRadarModule } from "@/lib/data/public-radar"
import { createRadarPageMetadata } from "@/lib/radar/metadata"

const META = RADAR_MODULE_META[RADAR_MODULE.HN]

export const metadata = createRadarPageMetadata({
  path: META.publicPath,
  title: META.label,
  description: META.description,
})

export default async function RadarHnPage() {
  const radarModule = await getPublicRadarModule(RADAR_MODULE.HN)
  if (!radarModule) notFound()

  const ranking = await getHnWeeklyRanking()

  return (
    <SiteContainer className="flex flex-col gap-10 py-12 sm:py-16">
      <RadarHeader
        title={META.label}
        description={META.description}
        basis={HN_RANKING_BASIS}
        period={HN_PERIOD}
        lastSyncedAt={radarModule.lastSyncedAt}
      />
      <HnRanking ranking={ranking} />
    </SiteContainer>
  )
}
