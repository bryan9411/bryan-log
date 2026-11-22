import { ArrowDownRightIcon, ArrowUpRightIcon, DotIcon } from "lucide-react"

import { CollectionRefreshButton } from "@/components/admin/radar/collections/collection-refresh-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { AdminRadarCollectionDetail } from "@/lib/data/admin-radar-collections"
import { formatDateTime } from "@/lib/format"
import type {
  CollectionChangeDirection,
  CollectionMetricRow,
} from "@/lib/radar/collections/compare"

const CHANGE_ICON: Record<CollectionChangeDirection, typeof DotIcon> = {
  up: ArrowUpRightIcon,
  down: ArrowDownRightIcon,
  changed: DotIcon,
}

type CollectionSnapshotCardProps = Pick<
  AdminRadarCollectionDetail,
  "id" | "savedAt" | "latestRefreshedAt" | "comparison"
>

// 兩欄對照：收藏當下（永不修改）與最新（每日同步或手動更新），數值欄位另列差異
export function CollectionSnapshotCard({
  id,
  savedAt,
  latestRefreshedAt,
  comparison,
}: CollectionSnapshotCardProps) {
  const renderChange = ({ change }: CollectionMetricRow) => {
    if (!change) return <span className="text-muted-foreground">—</span>
    const Icon = CHANGE_ICON[change.direction]
    return (
      <span className="inline-flex items-center gap-0.5 font-medium text-foreground">
        <Icon className="size-4 shrink-0" aria-hidden />
        {change.text}
      </span>
    )
  }

  const renderRow = (row: CollectionMetricRow) => (
    <TableRow key={row.key} className="hover:bg-transparent">
      <TableHead scope="row" className="w-40 py-2.5 pl-0 font-normal text-muted-foreground">
        {row.label}
      </TableHead>
      <TableCell className="py-2.5 tabular-nums">{row.saved}</TableCell>
      <TableCell className="py-2.5 tabular-nums">{row.latest}</TableCell>
      <TableCell className="py-2.5 pr-0 tabular-nums">{renderChange(row)}</TableCell>
    </TableRow>
  )

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <CardTitle>快照對照</CardTitle>
          <CardDescription className="flex flex-wrap gap-x-4 gap-y-1">
            <span>
              收藏當下：<time dateTime={savedAt}>{formatDateTime(savedAt)}</time>
            </span>
            <span>
              最新：
              {latestRefreshedAt ? (
                <time dateTime={latestRefreshedAt}>{formatDateTime(latestRefreshedAt)}</time>
              ) : (
                "尚未更新"
              )}
            </span>
          </CardDescription>
        </div>
        <CollectionRefreshButton id={id} />
      </CardHeader>
      <CardContent className="grid gap-5">
        <dl className="grid gap-x-6 gap-y-2 rounded-lg bg-muted/50 px-4 py-3 text-sm lg:grid-cols-2">
          {comparison.context.map(({ label, value }) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="shrink-0 text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="overflow-x-auto">
          <Table className="min-w-[480px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-40 pl-0">
                  <span className="sr-only">指標</span>
                </TableHead>
                <TableHead>收藏當下</TableHead>
                <TableHead>最新</TableHead>
                <TableHead className="pr-0">變化</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{comparison.metrics.map(renderRow)}</TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
