import type { LucideIcon } from "lucide-react"
import { GaugeIcon, ShieldAlertIcon, TrendingUpIcon, TriangleIcon } from "lucide-react"

import { HomeSection } from "@/components/home/home-section"
import { ExternalLink } from "@/components/site/external-link"
import { HOME_RADAR_PICKS, type HomeRadarPick } from "@/config/home"
import {
  RADAR_MODULE,
  RADAR_MODULE_META,
  SECURITY_ECOSYSTEM_LABEL,
  SECURITY_SEVERITY_LABEL,
  SECURITY_TAB,
  SECURITY_TAB_LABEL,
} from "@/config/radar"
import { ROUTES } from "@/config/routes"
import {
  getGithubWeeklyRanking,
  getHnWeeklyRanking,
  getPublicRadarModules,
  getSecurityRanking,
} from "@/lib/data/public-radar"
import { formatInteger, formatProbability } from "@/lib/format"
import type { GithubRankingItem, HnRankingItem } from "@/lib/radar/ranking"
import type { AdvisoryRankingItem, KevRankingItem } from "@/lib/radar/security/ranking"

type Metric = { icon: LucideIcon; text: string }

type PickCard = {
  key: string
  rank: number
  listLabel: string
  title: string
  // 標題前的淡色前綴，例如 GitHub 的 owner/
  titlePrefix?: string
  subtitle: string | null
  url: string
  metric: Metric | null
}

function githubCard(item: GithubRankingItem, index: number): PickCard {
  const [owner, repo] = item.fullName.split("/")
  return {
    key: item.id,
    rank: index + 1,
    listLabel: RADAR_MODULE_META[RADAR_MODULE.GITHUB].label,
    title: repo ?? item.fullName,
    titlePrefix: repo ? `${owner}/` : undefined,
    subtitle: item.description,
    url: item.url,
    metric: { icon: TrendingUpIcon, text: `本週 +${formatInteger(item.weeklyStars)} star` },
  }
}

function hnCard(item: HnRankingItem, index: number): PickCard {
  return {
    key: item.id,
    rank: index + 1,
    listLabel: RADAR_MODULE_META[RADAR_MODULE.HN].label,
    title: item.title,
    subtitle: item.domain,
    url: item.url,
    metric: { icon: TriangleIcon, text: `${formatInteger(item.points)} 分` },
  }
}

function epssMetric(epss: number | null): Metric | null {
  if (epss === null) return null
  return { icon: GaugeIcon, text: `EPSS ${formatProbability(epss)}` }
}

function kevCard(item: KevRankingItem, index: number): PickCard {
  const vendorProduct = [item.vendor, item.product].filter(Boolean).join(" · ")
  return {
    key: item.id,
    rank: index + 1,
    listLabel: SECURITY_TAB_LABEL[SECURITY_TAB.KEV],
    title: item.title,
    subtitle: vendorProduct ? `${item.cve} · ${vendorProduct}` : item.cve,
    url: item.url,
    metric:
      epssMetric(item.epss) ??
      (item.cvss ? { icon: GaugeIcon, text: `CVSS ${item.cvss.score.toFixed(1)}` } : null),
  }
}

// 沒有 EPSS（例如惡意套件）時改顯示嚴重等級
function advisoryCard(item: AdvisoryRankingItem, index: number): PickCard {
  const severity = item.isMalware ? "malware" : item.severity
  return {
    key: item.id,
    rank: index + 1,
    listLabel: SECURITY_TAB_LABEL[SECURITY_TAB.ADVISORY],
    title: item.title,
    subtitle: `${SECURITY_ECOSYSTEM_LABEL[item.ecosystem] ?? item.ecosystem} / ${item.packageName}`,
    url: item.url,
    metric: epssMetric(item.epss) ?? {
      icon: ShieldAlertIcon,
      text: SECURITY_SEVERITY_LABEL[severity] ?? severity,
    },
  }
}

// 只讀取設定檔用到的榜單；三個查詢都有 "use cache" 與 CACHE_TAG.RADAR，每日同步後隨標籤失效
async function loadCards(pick: HomeRadarPick): Promise<PickCard[]> {
  switch (pick.module) {
    case RADAR_MODULE.GITHUB: {
      const { items } = await getGithubWeeklyRanking()
      return items.slice(0, pick.limit).map(githubCard)
    }
    case RADAR_MODULE.HN: {
      const { top } = await getHnWeeklyRanking()
      return top.slice(0, pick.limit).map(hnCard)
    }
    case RADAR_MODULE.SECURITY: {
      const { kev, advisory } = await getSecurityRanking()
      return pick.list === SECURITY_TAB.KEV
        ? kev.slice(0, pick.limit).map(kevCard)
        : advisory.slice(0, pick.limit).map(advisoryCard)
    }
  }
}

function RadarPickCard({ card }: { card: PickCard }) {
  const maybeRenderSubtitle = () => {
    if (!card.subtitle) return null
    return <p className="line-clamp-2 text-sm text-pretty text-muted-foreground">{card.subtitle}</p>
  }

  const maybeRenderMetric = () => {
    if (!card.metric) return null
    const Icon = card.metric.icon
    return (
      <span className="flex items-center gap-1 font-semibold text-[#c25b3f] tabular-nums dark:text-[#de9070]">
        <Icon className="size-3.5" aria-hidden />
        {card.metric.text}
      </span>
    )
  }

  return (
    <article className="group relative flex h-full flex-col gap-2 rounded-xl border bg-card p-5 transition-colors hover:border-foreground/20">
      <p className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="truncate">{card.listLabel}</span>
        <span className="font-mono tabular-nums" aria-hidden>
          #{card.rank}
        </span>
        <span className="sr-only">第 {card.rank} 名</span>
      </p>
      <h3 className="line-clamp-2 text-base leading-snug font-semibold tracking-tight break-words">
        {/* 以偽元素讓整張卡片可點擊，同時保持單一連結的語意 */}
        <ExternalLink href={card.url} className="after:absolute after:inset-0 after:rounded-xl">
          {card.titlePrefix ? (
            <span className="font-normal text-muted-foreground">{card.titlePrefix}</span>
          ) : null}
          {card.title}
        </ExternalLink>
      </h3>
      {maybeRenderSubtitle()}
      <div className="mt-auto border-t border-border/60 pt-3 text-xs">{maybeRenderMetric()}</div>
    </article>
  )
}

// 只取公開模組的榜單；全部模組都隱藏、或榜單都還沒有資料時整段不顯示
export async function RadarPicks() {
  const modules = await getPublicRadarModules()
  const publicKeys = new Set(modules.map((radarModule) => radarModule.key))
  const picks = HOME_RADAR_PICKS.filter((pick) => publicKeys.has(pick.module))

  if (picks.length === 0) return null

  const cards = (await Promise.all(picks.map(loadCards))).flat()
  if (cards.length === 0) return null

  return (
    <div className="border-t border-border/60">
      <HomeSection
        id="radar-picks"
        title="技術週榜精選"
        description="每天自動同步的技術情報，節錄本週各榜單的前幾名。"
        moreHref={ROUTES.RADAR}
        moreLabel="看完整週榜"
      >
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <li key={card.key}>
              <RadarPickCard card={card} />
            </li>
          ))}
        </ol>
      </HomeSection>
    </div>
  )
}
