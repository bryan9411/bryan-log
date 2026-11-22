import { ArrowUpCircleIcon, GaugeIcon, PackageIcon, SirenIcon } from "lucide-react"

import {
  CweBadges,
  DANGER_BADGE_CLASS,
  formatEpss,
  TopicBadges,
  WARNING_BADGE_CLASS,
  WatchBadge,
} from "@/components/radar/security/security-badges"
import { ExternalLink } from "@/components/site/external-link"
import { Badge } from "@/components/ui/badge"
import { SECURITY_ECOSYSTEM_LABEL, SECURITY_SEVERITY_LABEL } from "@/config/radar"
import { formatCompactNumber, formatDateTime } from "@/lib/format"
import type { AdvisoryRankingItem } from "@/lib/radar/security/ranking"

export function SeverityBadge({
  item,
}: {
  item: Pick<AdvisoryRankingItem, "severity" | "isMalware">
}) {
  const severity = item.isMalware ? "malware" : item.severity
  const label = SECURITY_SEVERITY_LABEL[severity] ?? severity
  const isDanger = item.isMalware || severity === "critical"
  return (
    <Badge variant="outline" className={isDanger ? DANGER_BADGE_CLASS : WARNING_BADGE_CLASS}>
      {label}
    </Badge>
  )
}

export function ExploitedBadge({ inKev }: { inKev: boolean }) {
  if (!inKev) return null
  return (
    <Badge variant="outline" className={DANGER_BADGE_CLASS} title="這個 CVE 也收錄在 CISA KEV">
      <SirenIcon aria-hidden />
      已遭實際利用
    </Badge>
  )
}

// 開發生態漏洞：套件、公告標題與編號；有修補版本時「升級到 x.y.z」特別醒目
export function AdvisoryCard({ item }: { item: AdvisoryRankingItem }) {
  const ecosystem = SECURITY_ECOSYSTEM_LABEL[item.ecosystem] ?? item.ecosystem

  const maybeRenderPatched = () => {
    if (item.patchedVersion) {
      return (
        <span className="flex items-center gap-1 rounded-md bg-emerald-600/10 px-2 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">
          <ArrowUpCircleIcon className="size-3.5" aria-hidden />
          升級到 <span className="font-mono">{item.patchedVersion}</span>
        </span>
      )
    }
    if (item.isMalware) return <span>移除受影響的版本，並更換相關密鑰</span>
    return <span>尚無修補版本</span>
  }

  const maybeRenderRange = () => {
    if (!item.vulnerableRange) return null
    return (
      <span>
        受影響版本 <span className="font-mono text-foreground/80">{item.vulnerableRange}</span>
      </span>
    )
  }

  const maybeRenderEpss = () => {
    const text = formatEpss(item.epss, item.epssPercentile)
    if (!text) return null
    return (
      <span className="flex items-center gap-1 tabular-nums">
        <GaugeIcon className="size-3.5" aria-hidden />
        {text}
      </span>
    )
  }

  const maybeRenderDownloads = () => {
    if (item.npmWeeklyDownloads === null) return null
    return (
      <span className="flex items-center gap-1 tabular-nums">
        <PackageIcon className="size-3.5" aria-hidden />
        npm 週下載 {formatCompactNumber(item.npmWeeklyDownloads)}
      </span>
    )
  }

  const ids = [item.ghsa, item.cve].filter(Boolean).join(" · ")

  return (
    <article className="flex flex-col gap-2.5 rounded-xl px-4 py-5 transition-colors hover:bg-muted/60 sm:px-5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <SeverityBadge item={item} />
        <ExploitedBadge inKev={item.inKev} />
        <CweBadges cwes={item.cwes} />
        <TopicBadges topics={item.topics} />
        <WatchBadge keywords={item.watchKeywords} />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">
          {ecosystem} / <span className="font-mono text-foreground">{item.packageName}</span>
        </p>
        <h3 className="text-lg leading-snug font-semibold tracking-tight break-words">
          <ExternalLink href={item.url} className="hover:underline">
            {item.title}
          </ExternalLink>
        </h3>
        <p className="font-mono text-xs text-muted-foreground">{ids}</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {maybeRenderPatched()}
        {maybeRenderRange()}
        {maybeRenderEpss()}
        {maybeRenderDownloads()}
        {item.publishedAt ? (
          <time dateTime={item.publishedAt} className="tabular-nums">
            發布於 {formatDateTime(item.publishedAt)}
          </time>
        ) : null}
      </div>
    </article>
  )
}
