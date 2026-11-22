import { notFound } from "next/navigation"

import { RadarBasisPanel } from "@/components/radar/radar-header"
import {
  ADVISORY_PERIOD,
  ADVISORY_RANKING_BASIS,
  ADVISORY_SUMMARY,
  KEV_PERIOD,
  KEV_RANKING_BASIS,
  KEV_SUMMARY,
} from "@/components/radar/security/security-basis"
import {
  SecurityAttributions,
  SecurityResources,
} from "@/components/radar/security/security-resources"
import { SecurityTopicList } from "@/components/radar/security/security-topic-list"
import { PageHeader } from "@/components/site/page-header"
import { SiteContainer } from "@/components/site/site-container"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RADAR_MODULE, RADAR_MODULE_META, SECURITY_TAB, SECURITY_TAB_LABEL } from "@/config/radar"
import { getPublicRadarModule, getSecurityRanking } from "@/lib/data/public-radar"
import { createRadarPageMetadata } from "@/lib/radar/metadata"

const META = RADAR_MODULE_META[RADAR_MODULE.SECURITY]

export const metadata = createRadarPageMetadata({
  path: META.publicPath,
  title: META.label,
  description: META.description,
})

// 模組未公開時回 404，此時不查詢榜單；兩個分頁都預渲染進靜態外殼，切換分頁與主題不需要再向伺服器要資料
export default async function RadarSecurityPage() {
  const radarModule = await getPublicRadarModule(RADAR_MODULE.SECURITY)
  if (!radarModule) notFound()

  const ranking = await getSecurityRanking()

  return (
    <SiteContainer className="flex flex-col gap-14 py-12 sm:py-16">
      <div className="flex flex-col gap-8">
        <PageHeader title={META.label} description={META.description} />
        <Tabs defaultValue={SECURITY_TAB.KEV} className="flex flex-col gap-6">
          <TabsList aria-label="榜單">
            <TabsTrigger value={SECURITY_TAB.KEV}>
              {SECURITY_TAB_LABEL[SECURITY_TAB.KEV]}
            </TabsTrigger>
            <TabsTrigger value={SECURITY_TAB.ADVISORY}>
              {SECURITY_TAB_LABEL[SECURITY_TAB.ADVISORY]}
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value={SECURITY_TAB.KEV}
            forceMount
            className="flex flex-col gap-6 data-[state=inactive]:hidden"
          >
            <RadarBasisPanel
              summary={KEV_SUMMARY}
              basis={KEV_RANKING_BASIS}
              period={KEV_PERIOD}
              lastSyncedAt={radarModule.lastSyncedAt}
            />
            <SecurityTopicList
              kind="kev"
              label={SECURITY_TAB_LABEL[SECURITY_TAB.KEV]}
              items={ranking.kev}
            />
          </TabsContent>
          <TabsContent
            value={SECURITY_TAB.ADVISORY}
            forceMount
            className="flex flex-col gap-6 data-[state=inactive]:hidden"
          >
            <RadarBasisPanel
              summary={ADVISORY_SUMMARY}
              basis={ADVISORY_RANKING_BASIS}
              period={ADVISORY_PERIOD}
              lastSyncedAt={radarModule.lastSyncedAt}
            />
            <SecurityTopicList
              kind="advisory"
              label={SECURITY_TAB_LABEL[SECURITY_TAB.ADVISORY]}
              items={ranking.advisory}
            />
          </TabsContent>
        </Tabs>
      </div>
      <SecurityResources />
      <SecurityAttributions />
    </SiteContainer>
  )
}
