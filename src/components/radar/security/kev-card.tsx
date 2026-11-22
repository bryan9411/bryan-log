import { CalendarIcon, ChevronDownIcon, GaugeIcon, SkullIcon, TimerIcon } from "lucide-react"

import {
  CweBadges,
  DANGER_BADGE_CLASS,
  formatEpss,
  TopicBadges,
  WatchBadge,
} from "@/components/radar/security/security-badges"
import { ExternalLink } from "@/components/site/external-link"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/format"
import type { KevRankingItem } from "@/lib/radar/security/ranking"

const CISA_KEV_CATALOG_URL = "https://www.cisa.gov/known-exploited-vulnerabilities-catalog"

// KEV 的日期為台灣時區無關的 YYYY-MM-DD，以台灣午夜解讀避免顯示成前一天
function formatKevDate(value: string) {
  return formatDate(new Date(`${value}T00:00:00+08:00`))
}

// 實戰遭利用：CVE 與廠商／產品、徽章、EPSS／CVSS、日期；官方原文預設收合
export function KevCard({ item }: { item: KevRankingItem }) {
  const vendorProduct = [item.vendor, item.product].filter(Boolean).join(" · ")

  const maybeRenderRansomware = () => {
    if (!item.ransomware) return null
    return (
      <Badge variant="outline" className={DANGER_BADGE_CLASS}>
        <SkullIcon aria-hidden />
        勒索軟體利用
      </Badge>
    )
  }

  const maybeRenderEpss = () => {
    const text = formatEpss(item.epss, item.epssPercentile)
    if (!text) return null
    return (
      <span className="flex items-center gap-1 font-semibold text-[#c25b3f] tabular-nums dark:text-[#de9070]">
        <GaugeIcon className="size-3.5" aria-hidden />
        {text}
      </span>
    )
  }

  const maybeRenderCvss = () => {
    if (!item.cvss) return null
    return (
      <span className="tabular-nums">
        CVSS {item.cvss.score.toFixed(1)}
        <span className="text-muted-foreground/70">（v{item.cvss.version}）</span>
      </span>
    )
  }

  const maybeRenderDueDate = () => {
    if (!item.dueDate) return null
    return (
      <span className="flex items-center gap-1 tabular-nums">
        <TimerIcon className="size-3.5" aria-hidden />
        CISA 修補期限 {formatKevDate(item.dueDate)}
      </span>
    )
  }

  const maybeRenderOfficialText = () => {
    if (!item.shortDescription && !item.requiredAction) return null
    return (
      <details className="group/details text-sm">
        <summary className="flex w-fit cursor-pointer items-center gap-1 text-muted-foreground transition-colors select-none hover:text-foreground">
          <ChevronDownIcon
            className="size-4 transition-transform group-open/details:rotate-180"
            aria-hidden
          />
          官方說明與建議處置（英文原文）
        </summary>
        <dl className="mt-2 grid gap-2 leading-relaxed text-muted-foreground" lang="en">
          {item.shortDescription ? (
            <div>
              <dt className="font-medium text-foreground">Description</dt>
              <dd>{item.shortDescription}</dd>
            </div>
          ) : null}
          {item.requiredAction ? (
            <div>
              <dt className="font-medium text-foreground">Required action</dt>
              <dd>{item.requiredAction}</dd>
            </div>
          ) : null}
        </dl>
      </details>
    )
  }

  return (
    <article className="flex flex-col gap-2.5 rounded-xl px-4 py-5 transition-colors hover:bg-muted/60 sm:px-5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {maybeRenderRansomware()}
        <CweBadges cwes={item.cwes} />
        <TopicBadges topics={item.topics} />
        <WatchBadge keywords={item.watchKeywords} />
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-mono text-xs text-muted-foreground">
          {item.cve}
          {vendorProduct ? <span className="font-sans"> · {vendorProduct}</span> : null}
        </p>
        <h3 className="text-lg leading-snug font-semibold tracking-tight break-words">
          <ExternalLink href={item.url} className="hover:underline">
            {item.title}
          </ExternalLink>
        </h3>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {maybeRenderEpss()}
        {maybeRenderCvss()}
        <span className="flex items-center gap-1 tabular-nums">
          <CalendarIcon className="size-3.5" aria-hidden />
          加入 KEV {formatKevDate(item.dateAdded)}
        </span>
        {maybeRenderDueDate()}
      </div>
      {maybeRenderOfficialText()}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium">
        <ExternalLink href={item.url} className="text-muted-foreground hover:text-foreground">
          NVD 詳細頁
        </ExternalLink>
        <ExternalLink
          href={`${CISA_KEV_CATALOG_URL}?${new URLSearchParams({ search_api_fulltext: item.cve })}`}
          className="text-muted-foreground hover:text-foreground"
        >
          CISA KEV 目錄
        </ExternalLink>
      </div>
    </article>
  )
}
