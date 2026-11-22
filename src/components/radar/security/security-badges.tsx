import { EyeIcon } from "lucide-react"

import { ExternalLink } from "@/components/site/external-link"
import { Badge } from "@/components/ui/badge"
import { getCweLabel, getCweUrl } from "@/config/cwe-labels"
import { SECURITY_TOPIC_RULES, type SecurityTopic } from "@/config/radar"
import { formatProbability } from "@/lib/format"
import { cn } from "@/lib/utils"

// 資安卡片與後台表格共用的徽章；顏色只用來區分嚴重程度，文字本身就能表達意思

export const DANGER_BADGE_CLASS =
  "border-red-600/25 bg-red-600/10 text-red-700 dark:border-red-400/30 dark:bg-red-400/15 dark:text-red-300"
export const WARNING_BADGE_CLASS =
  "border-amber-600/25 bg-amber-500/10 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-200"

// 對照表沒有的 CWE 直接顯示編號；一律連到 MITRE 的定義頁
export function CweBadges({ cwes, className }: { cwes: string[]; className?: string }) {
  if (cwes.length === 0) return null
  return (
    <>
      {cwes.map((cwe) => {
        const label = getCweLabel(cwe)
        return (
          <Badge key={cwe} variant="outline" asChild className={cn("font-normal", className)}>
            <ExternalLink href={getCweUrl(cwe)} title={label === cwe ? cwe : `${cwe}：${label}`}>
              {label}
            </ExternalLink>
          </Badge>
        )
      })}
    </>
  )
}

export function TopicBadges({ topics }: { topics: SecurityTopic[] }) {
  if (topics.length === 0) return null
  return (
    <>
      {topics.map((topic) => (
        <Badge key={topic} variant="tag" className="font-normal">
          {SECURITY_TOPIC_RULES[topic].label}
        </Badge>
      ))}
    </>
  )
}

export function WatchBadge({ keywords }: { keywords: string[] }) {
  if (keywords.length === 0) return null
  return (
    <Badge variant="secondary" title={`命中關注關鍵字：${keywords.join("、")}`}>
      <EyeIcon aria-hidden />
      關注
    </Badge>
  )
}

export function formatEpss(epss: number | null, percentile: number | null) {
  if (epss === null) return null
  const rank = percentile === null ? "" : `（百分位 ${Math.round(percentile * 100)}）`
  return `EPSS ${formatProbability(epss)}${rank}`
}
