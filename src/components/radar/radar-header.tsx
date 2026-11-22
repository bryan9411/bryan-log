import { InfoIcon } from "lucide-react"

import { PageHeader } from "@/components/site/page-header"
import { Badge } from "@/components/ui/badge"
import { formatDateTime } from "@/lib/format"

type RadarHeaderProps = {
  title: string
  description: string
  // 每一項是一條統計規則，讓讀者能驗證排名
  basis: string[]
  period: string
  lastSyncedAt: string | null
  // 快照未滿統計天數時顯示「資料累積中」，數字為已累積的快照天數
  accumulatingDays?: number | null
}

export function RadarHeader({
  title,
  description,
  basis,
  period,
  lastSyncedAt,
  accumulatingDays,
}: RadarHeaderProps) {
  const maybeRenderAccumulating = () => {
    if (accumulatingDays === null || accumulatingDays === undefined) return null
    return <Badge variant="outline">資料累積中（已有 {accumulatingDays} 天快照）</Badge>
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} description={description} />
      <section
        aria-label="統計方式"
        className="flex flex-col gap-4 rounded-xl border bg-muted/30 px-5 py-4 text-sm"
      >
        <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-[auto_1fr] sm:items-center">
          <dt className="text-muted-foreground">統計期間</dt>
          <dd className="flex flex-wrap items-center gap-2 font-medium tabular-nums">
            {period}
            {maybeRenderAccumulating()}
          </dd>
          <dt className="text-muted-foreground">最後同步</dt>
          <dd className="font-medium tabular-nums">
            {lastSyncedAt ? (
              <time dateTime={lastSyncedAt}>{formatDateTime(lastSyncedAt)}</time>
            ) : (
              "尚未同步"
            )}
          </dd>
        </dl>
        <details className="group">
          <summary className="flex w-fit cursor-pointer items-center gap-1.5 text-muted-foreground transition-colors select-none hover:text-foreground">
            <InfoIcon className="size-4" aria-hidden />
            排名依據
          </summary>
          <ul className="mt-3 grid list-disc gap-1.5 pl-5 leading-relaxed text-muted-foreground">
            {basis.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </details>
      </section>
    </div>
  )
}
