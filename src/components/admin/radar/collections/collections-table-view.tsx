"use client"

import Link from "next/link"
import { ExternalLinkIcon, SearchXIcon, TriangleAlertIcon } from "lucide-react"

import { AdminPagination } from "@/components/admin/admin-pagination"
import { useCollectionListNavigation } from "@/components/admin/radar/collections/collection-list-navigation"
import { CollectionStatusSelect } from "@/components/admin/radar/collections/collection-status-select"
import { EmptyState } from "@/components/empty-state"
import { ExternalLink } from "@/components/site/external-link"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { adminRadarCollectionListRoute } from "@/config/admin-routes"
import { RADAR_COLLECTION_STATUS_LABEL } from "@/config/radar"
import { adminRadarCollectionRoute } from "@/config/routes"
import type {
  AdminRadarCollectionListItem,
  AdminRadarCollectionListPage,
} from "@/lib/data/admin-radar-collections"
import { formatDate, formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  ALL_FILTER,
  hasActiveCollectionFilters,
  RADAR_COLLECTION_STATUS_FILTERS,
  RADAR_COLLECTIONS_PAGE_SIZE,
  type AdminRadarCollectionListParams,
  type RadarCollectionStatusFilter,
} from "@/lib/validations/radar-collection"

type CollectionsTableViewProps = AdminRadarCollectionListPage & {
  params: AdminRadarCollectionListParams
}

const STATUS_FILTER_LABEL: Record<RadarCollectionStatusFilter, string> = {
  [ALL_FILTER]: "全部",
  ...RADAR_COLLECTION_STATUS_LABEL,
}

export function CollectionsTableView({
  collections,
  total,
  pageCount,
  statusCounts,
  params,
}: CollectionsTableViewProps) {
  const { isPending, navigate } = useCollectionListNavigation()

  const renderStatusTab = (status: RadarCollectionStatusFilter) => {
    const isActive = status === params.status

    return (
      <Link
        key={status}
        href={adminRadarCollectionListRoute({ ...params, status, page: 1 })}
        scroll={false}
        aria-current={isActive ? "page" : undefined}
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
          event.preventDefault()
          if (!isActive) navigate({ ...params, status, page: 1 })
        }}
        className={cn(
          "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          isActive
            ? "bg-background text-foreground shadow-sm dark:bg-input/40"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {STATUS_FILTER_LABEL[status]}
        <span className="text-xs text-muted-foreground tabular-nums">{statusCounts[status]}</span>
      </Link>
    )
  }

  const renderTitle = (collection: AdminRadarCollectionListItem) => (
    <div className="flex min-w-0 items-center gap-1.5">
      <Link
        href={adminRadarCollectionRoute(collection.id)}
        className="truncate font-medium text-foreground hover:underline"
        title={collection.title}
      >
        {collection.title}
      </Link>
      <ExternalLink
        href={collection.url}
        className="shrink-0 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground"
        aria-label={`在新分頁開啟「${collection.title}」的來源`}
      >
        <ExternalLinkIcon className="size-3.5" aria-hidden />
      </ExternalLink>
    </div>
  )

  const renderTags = ({ tags }: AdminRadarCollectionListItem) => {
    if (tags.length === 0) return <span className="text-muted-foreground">—</span>

    return (
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <Badge key={tag} asChild variant="tag" className="font-normal">
            <Link
              href={adminRadarCollectionListRoute({ ...params, tag, page: 1 })}
              scroll={false}
              title={`只看標籤「${tag}」`}
            >
              {tag}
            </Link>
          </Badge>
        ))}
      </div>
    )
  }

  const renderChange = (collection: AdminRadarCollectionListItem) => {
    if (collection.latestUnavailable) {
      return (
        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
          <TriangleAlertIcon className="size-3.5" aria-hidden />
          來源已刪除
        </span>
      )
    }
    if (collection.change) {
      return <span className="font-medium text-foreground tabular-nums">{collection.change}</span>
    }
    return <span className="text-muted-foreground">無明顯變化</span>
  }

  const renderRow = (collection: AdminRadarCollectionListItem) => (
    <TableRow key={collection.id} className="transition-colors hover:bg-muted/40">
      <TableCell className="py-3.5 pr-4 pl-5">{renderTitle(collection)}</TableCell>
      <TableCell className="w-44 px-4 py-3.5">
        <Badge variant="outline" className="font-normal">
          {collection.listLabel}
        </Badge>
      </TableCell>
      <TableCell className="w-40 px-4 py-3.5">
        <CollectionStatusSelect
          id={collection.id}
          title={collection.title}
          status={collection.status}
        />
      </TableCell>
      <TableCell className="w-52 px-4 py-3.5">{renderTags(collection)}</TableCell>
      <TableCell className="w-32 px-4 py-3.5 text-sm text-muted-foreground">
        <time dateTime={collection.savedAt} title={formatDateTime(collection.savedAt)}>
          {formatDate(collection.savedAt)}
        </time>
      </TableCell>
      <TableCell
        className="w-52 py-3.5 pr-5 pl-4 text-sm"
        title={
          collection.latestRefreshedAt
            ? `最新數據取得於 ${formatDateTime(collection.latestRefreshedAt)}`
            : undefined
        }
      >
        {renderChange(collection)}
      </TableCell>
    </TableRow>
  )

  const renderBody = () => {
    if (collections.length === 0) {
      const description = hasActiveCollectionFilters(params)
        ? "試著換個關鍵字、模組或標籤。"
        : `目前沒有「${STATUS_FILTER_LABEL[params.status]}」的收藏。`

      return (
        <div className="p-5">
          <EmptyState icon={SearchXIcon} title="找不到符合條件的收藏" description={description} />
        </div>
      )
    }

    return (
      <>
        <div className="overflow-x-auto">
          <Table className="min-w-[1080px] table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="py-3.5 pr-4 pl-5">標題</TableHead>
                <TableHead className="w-44 px-4 py-3.5">模組</TableHead>
                <TableHead className="w-40 px-4 py-3.5">狀態</TableHead>
                <TableHead className="w-52 px-4 py-3.5">標籤</TableHead>
                <TableHead className="w-32 px-4 py-3.5">收藏日期</TableHead>
                <TableHead className="w-52 py-3.5 pr-5 pl-4">收藏後變化</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{collections.map(renderRow)}</TableBody>
          </Table>
        </div>
        <AdminPagination
          label="收藏列表分頁"
          unit="筆收藏"
          counter="筆"
          page={params.page}
          pageSize={RADAR_COLLECTIONS_PAGE_SIZE}
          total={total}
          pageCount={pageCount}
          hrefFor={(page) => adminRadarCollectionListRoute({ ...params, page })}
          onNavigate={(page) => navigate({ ...params, page })}
        />
      </>
    )
  }

  return (
    <div className="grid gap-4">
      <nav
        aria-label="依研究狀態分頁"
        className="flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-muted p-1"
      >
        {RADAR_COLLECTION_STATUS_FILTERS.map(renderStatusTab)}
      </nav>
      <div
        aria-busy={isPending}
        className={cn(
          "overflow-hidden rounded-xl border bg-card transition-opacity",
          isPending && "pointer-events-none opacity-60",
        )}
      >
        {renderBody()}
      </div>
    </div>
  )
}
