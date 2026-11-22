import { ShieldAlertIcon } from "lucide-react"

import { RadarItemTitle } from "@/components/admin/radar/radar-item-title"
import { RadarRankingTable } from "@/components/admin/radar/radar-ranking-table"
import { EmptyState } from "@/components/empty-state"
import { ExploitedBadge, SeverityBadge } from "@/components/radar/security/advisory-card"
import {
  CweBadges,
  DANGER_BADGE_CLASS,
  TopicBadges,
  WatchBadge,
} from "@/components/radar/security/security-badges"
import { Badge } from "@/components/ui/badge"
import { SECURITY_ADMIN_RANKING_SIZE, SECURITY_RANKING_SIZE } from "@/config/radar"
import { formatCompactNumber, formatDate, formatProbability } from "@/lib/format"
import type { AdvisoryRankingItem, KevRankingItem } from "@/lib/radar/security/ranking"

const muted = <span className="text-muted-foreground">—</span>
const FOOTER = `前台顯示前 ${SECURITY_RANKING_SIZE} 名、後台顯示到第 ${SECURITY_ADMIN_RANKING_SIZE} 名；淡色為遞補候選，隱藏上方項目後會依序遞補`

function EmptyRanking({ topic }: { topic: boolean }) {
  return (
    <EmptyState
      icon={ShieldAlertIcon}
      title={topic ? "這個主題沒有項目" : "還沒有資料"}
      description={
        topic
          ? "切換到「全部」查看完整榜單。"
          : "可先按上方的「立即同步」抓取 CISA KEV 與 GitHub Advisory。"
      }
    />
  )
}

function epssCell(epss: number | null) {
  return epss === null ? muted : formatProbability(epss)
}

function badgesCell(item: Pick<KevRankingItem, "cwes" | "topics" | "watchKeywords">) {
  if (item.cwes.length + item.topics.length + item.watchKeywords.length === 0) return muted
  return (
    <div className="flex flex-wrap gap-1">
      <WatchBadge keywords={item.watchKeywords} />
      <CweBadges cwes={item.cwes} />
      <TopicBadges topics={item.topics} />
    </div>
  )
}

type TableProps<T> = { items: T[]; filtered: boolean }

export function KevRankingTable({ items, filtered }: TableProps<KevRankingItem>) {
  if (items.length === 0) return <EmptyRanking topic={filtered} />

  return (
    <RadarRankingTable
      mode="ranking"
      minWidth="min-w-[1100px]"
      rankingSize={SECURITY_RANKING_SIZE}
      rows={items.slice(0, SECURITY_ADMIN_RANKING_SIZE)}
      columns={[
        {
          key: "title",
          header: "漏洞",
          render: (item) => (
            <RadarItemTitle
              title={item.title}
              url={item.url}
              subtitle={[item.cve, item.vendor, item.product].filter(Boolean).join(" · ")}
            />
          ),
        },
        {
          key: "ransomware",
          header: "勒索軟體",
          className: "w-24",
          render: (item) =>
            item.ransomware ? (
              <Badge variant="outline" className={DANGER_BADGE_CLASS}>
                Known
              </Badge>
            ) : (
              muted
            ),
        },
        {
          key: "badges",
          header: "類型／主題",
          className: "w-64",
          render: badgesCell,
        },
        {
          key: "epss",
          header: "EPSS",
          className: "w-20 text-right font-semibold tabular-nums",
          render: (item) => epssCell(item.epss),
        },
        {
          key: "cvss",
          header: "CVSS",
          className: "w-16 text-right tabular-nums",
          render: (item) => (item.cvss ? item.cvss.score.toFixed(1) : muted),
        },
        {
          key: "dateAdded",
          header: "加入 KEV",
          className: "w-32 text-muted-foreground tabular-nums",
          render: (item) => formatDate(new Date(`${item.dateAdded}T00:00:00+08:00`)),
        },
      ]}
      footer={FOOTER}
    />
  )
}

export function AdvisoryRankingTable({ items, filtered }: TableProps<AdvisoryRankingItem>) {
  if (items.length === 0) return <EmptyRanking topic={filtered} />

  return (
    <RadarRankingTable
      mode="ranking"
      minWidth="min-w-[1180px]"
      rankingSize={SECURITY_RANKING_SIZE}
      rows={items.slice(0, SECURITY_ADMIN_RANKING_SIZE)}
      columns={[
        {
          key: "title",
          header: "公告",
          render: (item) => (
            <RadarItemTitle
              title={item.title}
              url={item.url}
              subtitle={`${item.ecosystem}/${item.packageName} · ${item.ghsa}${item.cve ? ` · ${item.cve}` : ""}`}
            />
          ),
        },
        {
          key: "severity",
          header: "等級",
          className: "w-36",
          render: (item) => (
            <div className="flex flex-wrap gap-1">
              <SeverityBadge item={item} />
              <ExploitedBadge inKev={item.inKev} />
            </div>
          ),
        },
        {
          key: "badges",
          header: "類型／主題",
          className: "w-56",
          render: badgesCell,
        },
        {
          key: "patched",
          header: "修補版本",
          className: "w-28 font-mono text-xs",
          render: (item) => item.patchedVersion ?? muted,
        },
        {
          key: "epss",
          header: "EPSS",
          className: "w-20 text-right font-semibold tabular-nums",
          render: (item) => epssCell(item.epss),
        },
        {
          key: "downloads",
          header: "npm 週下載",
          className: "w-24 text-right tabular-nums",
          render: (item) =>
            item.npmWeeklyDownloads === null ? muted : formatCompactNumber(item.npmWeeklyDownloads),
        },
        {
          key: "publishedAt",
          header: "發布",
          className: "w-28 text-muted-foreground tabular-nums",
          render: (item) => (item.publishedAt ? formatDate(item.publishedAt) : muted),
        },
      ]}
      footer={FOOTER}
    />
  )
}
