import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ArrowLeftIcon, ExternalLinkIcon, TriangleAlertIcon } from "lucide-react"

import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { CollectionDeleteButton } from "@/components/admin/radar/collections/collection-delete-button"
import { CollectionResearchForm } from "@/components/admin/radar/collections/collection-research-form"
import { CollectionSnapshotCard } from "@/components/admin/radar/collections/collection-snapshot-card"
import { ExternalLink } from "@/components/site/external-link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { RADAR_COLLECTION_STATUS_LABEL, RADAR_MODULE_META } from "@/config/radar"
import { ROUTES } from "@/config/routes"
import { getAdminRadarCollection } from "@/lib/data/admin-radar-collections"
import { formatDateTime } from "@/lib/format"
import { renderCollectionNote } from "@/lib/radar/collections/note"
import { radarCollectionIdSchema } from "@/lib/validations/radar-collection"

export const metadata: Metadata = {
  title: "收藏詳細",
}

// 「重新整理最新數據」的 Server Action 在此頁執行，KEV 需要下載整份目錄
export const maxDuration = 60

async function CollectionDetail({ params }: PageProps<"/admin/radar/collections/[id]">) {
  const { id } = await params
  if (!radarCollectionIdSchema.safeParse(id).success) notFound()

  const collection = await getAdminRadarCollection(id)
  if (!collection) notFound()

  const maybeRenderUnavailable = () => {
    if (!collection.latestUnavailable) return null
    return (
      <div
        role="alert"
        className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300"
      >
        <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          來源已刪除、改為私人或已撤回，無法再取得最新數據；對照表保留最後一次取得的數據。
        </span>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      <section aria-labelledby="collection-title" className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-normal">
            {collection.listLabel}
          </Badge>
          <Badge variant="secondary" className="font-normal">
            {RADAR_COLLECTION_STATUS_LABEL[collection.status]}
          </Badge>
        </div>
        <h2
          id="collection-title"
          className="text-xl font-semibold tracking-tight break-all sm:text-2xl"
        >
          <ExternalLink href={collection.url} className="group inline hover:underline">
            {collection.title}
            <ExternalLinkIcon
              className="ml-1.5 inline size-4 align-baseline text-muted-foreground transition-colors group-hover:text-foreground"
              aria-hidden
            />
          </ExternalLink>
        </h2>
        {collection.summary ? (
          <p className="max-w-3xl text-sm text-pretty text-muted-foreground">
            {collection.summary}
          </p>
        ) : null}
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <div className="flex gap-1.5">
            <dt>收藏於</dt>
            <dd className="text-foreground">
              <time dateTime={collection.savedAt}>{formatDateTime(collection.savedAt)}</time>
            </dd>
          </div>
          <div className="flex gap-1.5">
            <dt>最後更新</dt>
            <dd className="text-foreground">
              {collection.latestRefreshedAt ? (
                <time dateTime={collection.latestRefreshedAt}>
                  {formatDateTime(collection.latestRefreshedAt)}
                </time>
              ) : (
                "尚未更新"
              )}
            </dd>
          </div>
          <div className="flex gap-1.5">
            <dt>榜單</dt>
            <dd>
              {collection.inPool ? (
                <Link
                  href={RADAR_MODULE_META[collection.moduleKey].adminPath}
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  {collection.moduleLabel}
                </Link>
              ) : (
                <span>已移出 {collection.moduleLabel} 候選池（收藏仍保留）</span>
              )}
            </dd>
          </div>
        </dl>
        {maybeRenderUnavailable()}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>研究</CardTitle>
          <CardDescription>研究狀態、標籤與筆記只有自己看得到，不會出現在前台。</CardDescription>
        </CardHeader>
        <CardContent>
          <CollectionResearchForm
            id={collection.id}
            status={collection.status}
            note={collection.note}
            tags={collection.tags}
            noteHtml={renderCollectionNote(collection.note)}
          />
        </CardContent>
      </Card>

      <CollectionSnapshotCard
        id={collection.id}
        savedAt={collection.savedAt}
        latestRefreshedAt={collection.latestRefreshedAt}
        comparison={collection.comparison}
      />

      <Card>
        <CardHeader>
          <CardTitle>操作</CardTitle>
          <CardDescription>
            刪除後筆記與標籤無法復原；只想停止追蹤時，可以把狀態改為「封存」。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CollectionDeleteButton id={collection.id} title={collection.title} />
        </CardContent>
      </Card>
    </div>
  )
}

function CollectionDetailSkeleton() {
  return (
    <div className="grid gap-6" aria-busy aria-label="收藏載入中">
      <div className="grid gap-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="h-[32rem] rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
    </div>
  )
}

export default function AdminRadarCollectionPage(
  props: PageProps<"/admin/radar/collections/[id]">,
) {
  return (
    <>
      <AdminPageHeader
        title="收藏詳細"
        actions={
          <Button asChild variant="ghost">
            <Link href={ROUTES.ADMIN_RADAR_COLLECTIONS}>
              <ArrowLeftIcon aria-hidden />
              返回收藏列表
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<CollectionDetailSkeleton />}>
        <CollectionDetail {...props} />
      </Suspense>
    </>
  )
}
