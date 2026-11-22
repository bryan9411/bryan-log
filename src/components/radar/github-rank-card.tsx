import { PackageIcon, ScaleIcon, StarIcon, TrendingUpIcon } from "lucide-react"

import { ExternalLink } from "@/components/site/external-link"
import { Badge } from "@/components/ui/badge"
import { GITHUB_CATEGORY_RULES } from "@/config/radar"
import { formatCompactNumber, formatInteger } from "@/lib/format"
import type { GithubRankingItem } from "@/lib/radar/ranking"

// 版面與文章列表一致：資訊列、標題、兩行描述；整張卡片點擊另開 GitHub
export function GithubRankCard({ item }: { item: GithubRankingItem }) {
  const [owner, repo] = item.fullName.split("/")

  const maybeRenderDescription = () => {
    if (!item.description) return null
    return (
      <p className="line-clamp-2 text-sm leading-relaxed text-pretty text-muted-foreground">
        {item.description}
      </p>
    )
  }

  const maybeRenderCategories = () => {
    if (item.categories.length === 0) return null
    return (
      <span className="flex flex-wrap items-center gap-2">
        {item.categories.map((category) => (
          <Badge key={category} variant="tag" className="font-normal">
            {GITHUB_CATEGORY_RULES[category].label}
          </Badge>
        ))}
      </span>
    )
  }

  const maybeRenderLanguage = () => {
    if (!item.language) return null
    return <span>{item.language}</span>
  }

  const maybeRenderLicense = () => {
    if (!item.license) return null
    return (
      <span className="flex items-center gap-1">
        <ScaleIcon className="size-3.5" aria-hidden />
        <span className="sr-only">授權：</span>
        {item.license}
      </span>
    )
  }

  const maybeRenderNpm = () => {
    if (item.npmWeeklyDownloads === null) return null
    return (
      <span className="flex items-center gap-1" title={item.npmPackage ?? undefined}>
        <PackageIcon className="size-3.5" aria-hidden />
        npm 週下載 {formatCompactNumber(item.npmWeeklyDownloads)}
      </span>
    )
  }

  return (
    <article className="group relative flex flex-col gap-2.5 rounded-xl px-4 py-5 transition-colors hover:bg-muted/60 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1 font-semibold text-[#c25b3f] tabular-nums dark:text-[#de9070]">
          <TrendingUpIcon className="size-3.5" aria-hidden />
          本週 +{formatInteger(item.weeklyStars)} star
        </span>
        {maybeRenderCategories()}
        {maybeRenderLanguage()}
        <span className="flex items-center gap-1 tabular-nums">
          <StarIcon className="size-3.5" aria-hidden />
          <span className="sr-only">總 star：</span>
          {formatCompactNumber(item.totalStars)}
        </span>
        {maybeRenderLicense()}
        {maybeRenderNpm()}
      </div>
      <h3 className="text-lg leading-snug font-semibold tracking-tight break-words">
        {/* 以偽元素讓整張卡片可點擊，同時保持單一連結的語意 */}
        <ExternalLink href={item.url} className="after:absolute after:inset-0 after:rounded-xl">
          <span className="font-normal text-muted-foreground">{owner}/</span>
          {repo}
        </ExternalLink>
      </h3>
      {maybeRenderDescription()}
    </article>
  )
}
