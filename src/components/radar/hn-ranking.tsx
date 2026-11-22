import { HnRankCard } from "@/components/radar/hn-rank-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HN_TAB, HN_TAB_LABEL, RADAR_RANKING_SIZE, type HnTab } from "@/config/radar"
import type { HnRanking } from "@/lib/data/public-radar"
import type { HnRankingItem } from "@/lib/radar/ranking"

type HnRankingProps = {
  ranking: HnRanking
}

const HN_TABS: HnTab[] = [HN_TAB.TOP, HN_TAB.SHOW]

export function HnRankingList({ items }: { items: HnRankingItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
        近 7 天還沒有資料。
      </p>
    )
  }

  return (
    <ol aria-label="Hacker News 週榜" className="-mx-4 sm:-mx-5">
      {items.slice(0, RADAR_RANKING_SIZE).map((item) => (
        <li key={item.id}>
          <HnRankCard item={item} />
        </li>
      ))}
    </ol>
  )
}

// 兩個分頁都預渲染進靜態外殼，切換分頁不需要再向伺服器要資料
export function HnRanking({ ranking }: HnRankingProps) {
  const itemsByTab: Record<HnTab, HnRankingItem[]> = {
    [HN_TAB.TOP]: ranking.top,
    [HN_TAB.SHOW]: ranking.show,
  }

  return (
    <Tabs defaultValue={HN_TAB.TOP} className="flex flex-col gap-5">
      <TabsList aria-label="榜單">
        {HN_TABS.map((tab) => (
          <TabsTrigger key={tab} value={tab}>
            {HN_TAB_LABEL[tab]}
          </TabsTrigger>
        ))}
      </TabsList>
      {HN_TABS.map((tab) => (
        <TabsContent key={tab} value={tab}>
          <HnRankingList items={itemsByTab[tab]} />
        </TabsContent>
      ))}
    </Tabs>
  )
}
