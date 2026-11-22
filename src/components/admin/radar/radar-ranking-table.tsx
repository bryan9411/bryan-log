import type { ReactNode } from "react"

import { RadarBlockButton } from "@/components/admin/radar/radar-block-button"
import { RadarCollectButton } from "@/components/admin/radar/radar-collect-button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RADAR_RANKING_SIZE } from "@/config/radar"
import { cn } from "@/lib/utils"

export type RadarTableColumn<T> = {
  key: string
  header: string
  className?: string
  render: (row: T) => ReactNode
}

// blockedByRule：被排除關鍵字自動隱藏的項目不能手動還原，要刪除規則才會還原
// collectionId：榜單列才有（null 代表尚未收藏）；已隱藏清單不提供收藏
type RadarTableRow = {
  id: string
  title: string
  blockedByRule?: boolean
  collectionId?: string | null
}

type RadarRankingTableProps<T extends RadarTableRow> = {
  rows: T[]
  columns: RadarTableColumn<T>[]
  // 目前榜單顯示名次與「隱藏」；已隱藏清單不顯示名次，按鈕改為「還原」
  mode: "ranking" | "blocked"
  minWidth?: string
  footer?: ReactNode
  // 前台顯示的名次數，之後的列以淡色顯示為遞補候選
  rankingSize?: number
}

// 各模組後台共用的表格：超過前台名次的列以淡色顯示，方便判斷隱藏後由誰遞補
export function RadarRankingTable<T extends RadarTableRow>({
  rows,
  columns,
  mode,
  minWidth = "min-w-[960px]",
  footer,
  rankingSize = RADAR_RANKING_SIZE,
}: RadarRankingTableProps<T>) {
  const isRanking = mode === "ranking"
  const actionWidth = isRanking ? "w-52" : "w-28"

  const renderAction = (row: T) => {
    if (!isRanking && row.blockedByRule) {
      return <span className="text-xs text-muted-foreground">刪除規則後自動還原</span>
    }
    if (!isRanking || row.collectionId === undefined) {
      return <RadarBlockButton id={row.id} title={row.title} block={isRanking} />
    }
    return (
      <div className="flex items-start justify-end gap-1">
        <RadarCollectButton id={row.id} title={row.title} collectionId={row.collectionId} />
        <RadarBlockButton id={row.id} title={row.title} block />
      </div>
    )
  }

  const renderRow = (row: T, index: number) => {
    const isReserve = isRanking && index >= rankingSize

    return (
      <TableRow
        key={row.id}
        className={cn("transition-colors hover:bg-muted/40", isReserve && "opacity-55")}
      >
        {isRanking ? (
          <TableCell className="w-16 py-3.5 pl-5 font-mono text-sm text-muted-foreground tabular-nums">
            {index + 1}
          </TableCell>
        ) : null}
        {columns.map((column) => (
          <TableCell key={column.key} className={cn("px-4 py-3.5 text-sm", column.className)}>
            {column.render(row)}
          </TableCell>
        ))}
        <TableCell className={cn(actionWidth, "py-3.5 pr-5 text-right")}>
          {renderAction(row)}
        </TableCell>
      </TableRow>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <Table className={cn("table-fixed", minWidth)}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {isRanking ? <TableHead className="w-16 py-3 pl-5">名次</TableHead> : null}
              {columns.map((column) => (
                <TableHead key={column.key} className={cn("px-4 py-3", column.className)}>
                  {column.header}
                </TableHead>
              ))}
              <TableHead className={cn(actionWidth, "py-3 pr-5 text-right")}>
                <span className="sr-only">操作</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{rows.map(renderRow)}</TableBody>
        </Table>
      </div>
      {footer ? (
        <div className="border-t px-5 py-3.5 text-sm text-muted-foreground">{footer}</div>
      ) : null}
    </div>
  )
}
