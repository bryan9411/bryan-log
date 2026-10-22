import type { Metadata } from "next"
import Link from "next/link"
import { draftMode } from "next/headers"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { EyeIcon, PencilIcon, XIcon } from "lucide-react"
import { z } from "zod"

import { PostStatusBadge } from "@/components/admin/posts/post-status-badge"
import { PostArticle } from "@/components/posts/post-article"
import { ReadingProgress } from "@/components/posts/reading-progress"
import { SiteContainer } from "@/components/site/site-container"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { adminEditPostRoute, disablePreviewRoute } from "@/config/routes"
import { getAdminUser } from "@/lib/auth/session"
import { getPreviewPost, type PreviewPost } from "@/lib/data/posts"

export const metadata: Metadata = {
  title: "草稿預覽",
  robots: { index: false, follow: false },
}

function PreviewBanner({ post, id }: { post: PreviewPost; id: string }) {
  return (
    <div role="status" className="border-b border-border/60 bg-muted/60">
      <SiteContainer className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
        <p className="flex items-center gap-2 text-muted-foreground">
          <EyeIcon className="size-4 shrink-0" aria-hidden />
          <span>預覽模式・僅管理員可見，顯示最後一次儲存的內容</span>
          <PostStatusBadge status={post.status} />
        </p>
        <div className="flex items-center gap-1.5">
          <Button asChild variant="ghost" size="sm">
            <Link href={adminEditPostRoute(id)}>
              <PencilIcon aria-hidden />
              返回編輯
            </Link>
          </Button>
          {/* 結束預覽需經過 Route Handler 清除 Draft Mode Cookie，使用一般連結避免被預先載入 */}
          <Button asChild variant="outline" size="sm">
            <a href={disablePreviewRoute(id)}>
              <XIcon aria-hidden />
              結束預覽
            </a>
          </Button>
        </div>
      </SiteContainer>
    </div>
  )
}

// 雙重把關：必須同時啟用 Draft Mode 且為已登入的管理員，任一條件不符一律回應 404，不透露草稿是否存在
async function PreviewContent({ params }: PageProps<"/preview/posts/[id]">) {
  const [{ id }, { isEnabled }] = await Promise.all([params, draftMode()])

  if (!isEnabled || !z.uuid().safeParse(id).success) notFound()

  const user = await getAdminUser()
  if (!user) notFound()

  const post = await getPreviewPost(id)
  if (!post) notFound()

  return (
    <>
      <ReadingProgress />
      <PreviewBanner post={post} id={id} />
      <PostArticle post={post} />
    </>
  )
}

export default function PreviewPostPage(props: PageProps<"/preview/posts/[id]">) {
  return (
    <Suspense
      fallback={
        <SiteContainer className="grid max-w-3xl gap-5 py-14" aria-busy aria-label="預覽載入中">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-96" />
        </SiteContainer>
      }
    >
      <PreviewContent {...props} />
    </Suspense>
  )
}
