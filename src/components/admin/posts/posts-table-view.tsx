"use client"

import Link from "next/link"
import { useState } from "react"
import { PencilIcon, Trash2Icon, XIcon } from "lucide-react"

import { DeletePostsForm, type DeletePostTarget } from "@/components/admin/posts/delete-posts-form"
import { PostCoverThumbnail } from "@/components/admin/posts/post-cover-thumbnail"
import { usePostListNavigation } from "@/components/admin/posts/post-list-navigation"
import { PostStatusBadge } from "@/components/admin/posts/post-status-badge"
import { PostsPagination } from "@/components/admin/posts/posts-pagination"
import { FormMessage } from "@/components/forms/form-message"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { adminEditPostRoute } from "@/config/routes"
import { ACTION_STATUS } from "@/lib/actions/action-state"
import type { AdminPostListItem, AdminPostListPage } from "@/lib/data/posts"
import { formatDateTime, formatRelativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { AdminPostListParams } from "@/lib/validations/admin-post-list"

type Selection = {
  // 選取狀態只屬於當下這一頁：換頁、搜尋或刪除後列表內容不同，舊的選取自動失效
  listKey: string
  ids: ReadonlySet<string>
}

type PostsTableViewProps = AdminPostListPage & {
  params: AdminPostListParams
  // 由伺服器傳入的請求時間，伺服器與客戶端算出的相對時間一致，不會產生 Hydration 差異
  now: number
}

const toDeleteTarget = ({ id, title }: AdminPostListItem): DeletePostTarget => ({ id, title })

export function PostsTableView({ posts, total, pageCount, params, now }: PostsTableViewProps) {
  const { isPending } = usePostListNavigation()

  const listKey = posts.map((post) => post.id).join(",")
  const [selection, setSelection] = useState<Selection>({ listKey, ids: new Set() })
  // 對話框內容與開關狀態分開保存：關閉動畫播放期間內容仍保留，不會閃成空白
  const [deleting, setDeleting] = useState<DeletePostTarget[]>([])
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  // 每次開啟對話框遞增，作為表單的 key，確保重新開啟時錯誤訊息是乾淨的
  const [deleteSession, setDeleteSession] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)

  const selectedIds = selection.listKey === listKey ? selection.ids : new Set<string>()
  const selectedPosts = posts.filter((post) => selectedIds.has(post.id))
  const isAllSelected = posts.length > 0 && selectedPosts.length === posts.length
  const headerChecked = isAllSelected ? true : selectedPosts.length > 0 ? "indeterminate" : false

  const updateSelection = (ids: Set<string>) => setSelection({ listKey, ids })

  const toggleRow = (id: string, checked: boolean) => {
    const ids = new Set(selectedIds)
    if (checked) ids.add(id)
    else ids.delete(id)
    updateSelection(ids)
  }

  const toggleAll = () => {
    updateSelection(isAllSelected ? new Set() : new Set(posts.map((post) => post.id)))
  }

  const openDelete = (targets: DeletePostTarget[]) => {
    setNotice(null)
    setDeleting(targets)
    setDeleteSession((session) => session + 1)
    setIsDeleteOpen(true)
  }

  const handleDeleted = (message: string) => {
    setIsDeleteOpen(false)
    updateSelection(new Set())
    setNotice(message)
  }

  const renderCategory = (post: AdminPostListItem) => {
    if (!post.categoryName) return <span className="text-muted-foreground">未分類</span>

    const fullCategoryName = post.parentCategoryName
      ? `${post.parentCategoryName} / ${post.categoryName}`
      : post.categoryName

    return (
      <span className="block truncate" title={fullCategoryName}>
        {post.parentCategoryName ? (
          <span className="text-muted-foreground">{post.parentCategoryName} / </span>
        ) : null}
        {post.categoryName}
      </span>
    )
  }

  const renderRow = (post: AdminPostListItem) => {
    const isSelected = selectedIds.has(post.id)

    return (
      <TableRow
        key={post.id}
        data-state={isSelected ? "selected" : undefined}
        className="transition-colors hover:bg-muted/40 data-[state=selected]:bg-muted/60"
      >
        <TableCell className="w-12 py-4 pr-0 pl-5">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => toggleRow(post.id, checked === true)}
            aria-label={`選取「${post.title}」`}
          />
        </TableCell>
        <TableCell className="w-20 px-3 py-4">
          <PostCoverThumbnail src={post.coverImageUrl} />
        </TableCell>
        <TableCell className="py-4 pr-5 pl-2">
          <Link
            href={adminEditPostRoute(post.id)}
            className="block truncate font-medium text-foreground hover:underline"
            title={post.title}
          >
            {post.title}
          </Link>
          <span className="mt-1 block truncate font-mono text-xs text-muted-foreground">
            /{post.slug}
          </span>
        </TableCell>
        <TableCell className="w-52 px-5 py-4 text-sm text-foreground/80">
          {renderCategory(post)}
        </TableCell>
        <TableCell className="w-24 px-5 py-4">
          <PostStatusBadge status={post.status} />
        </TableCell>
        <TableCell className="w-28 px-5 py-4 text-right text-foreground/80 tabular-nums">
          {post.viewCount.toLocaleString("zh-TW")}
        </TableCell>
        <TableCell className="w-36 px-5 py-4 text-sm text-muted-foreground">
          <time dateTime={post.updatedAt} title={formatDateTime(post.updatedAt)}>
            {formatRelativeTime(post.updatedAt, now)}
          </time>
        </TableCell>
        <TableCell className="w-40 px-5 py-4">
          <div className="flex items-center justify-end gap-1.5">
            <Button asChild variant="ghost" size="sm">
              <Link href={adminEditPostRoute(post.id)}>
                <PencilIcon aria-hidden />
                編輯
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`刪除「${post.title}」`}
              onClick={() => openDelete([toDeleteTarget(post)])}
            >
              <Trash2Icon aria-hidden />
              刪除
            </Button>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  const maybeRenderNotice = () => {
    if (!notice) return null
    return <FormMessage state={{ status: ACTION_STATUS.SUCCESS, message: notice }} />
  }

  const maybeRenderBulkBar = () => {
    if (selectedPosts.length === 0) return null

    return (
      <div
        role="region"
        aria-label="批次操作"
        className="sticky bottom-4 z-20 mx-auto flex w-fit animate-in items-center gap-3 rounded-xl border bg-popover py-2 pr-2 pl-4 text-sm text-popover-foreground shadow-lg fade-in-0 slide-in-from-bottom-2"
      >
        <span className="tabular-nums">
          已選取 <strong className="font-semibold">{selectedPosts.length}</strong> 篇文章
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={() => updateSelection(new Set())}>
          <XIcon aria-hidden />
          取消選取
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => openDelete(selectedPosts.map(toDeleteTarget))}
        >
          <Trash2Icon aria-hidden />
          批次刪除
        </Button>
      </div>
    )
  }

  const maybeRenderDeleteDialogContent = () => {
    if (deleting.length === 0) return null

    const title =
      deleting.length === 1
        ? `確定要刪除「${deleting[0].title}」嗎？`
        : `確定要刪除選取的 ${deleting.length} 篇文章嗎？`

    return (
      <>
        <DialogHeader>
          <DialogTitle className="break-all">{title}</DialogTitle>
          <DialogDescription>
            文章內容與瀏覽數將一併刪除，前台頁面會同步下架。此動作無法復原。
          </DialogDescription>
        </DialogHeader>
        <DeletePostsForm key={deleteSession} posts={deleting} onSuccess={handleDeleted} />
      </>
    )
  }

  return (
    <div className="grid gap-4">
      {maybeRenderNotice()}

      <div
        aria-busy={isPending}
        className={cn(
          "overflow-hidden rounded-xl border bg-card transition-opacity",
          isPending && "pointer-events-none opacity-60",
        )}
      >
        <Table className="min-w-[1080px] table-fixed">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 py-3.5 pr-0 pl-5">
                <Checkbox
                  checked={headerChecked}
                  onCheckedChange={toggleAll}
                  aria-label={isAllSelected ? "取消全選" : "全選本頁文章"}
                />
              </TableHead>
              <TableHead className="w-20 px-3 py-3.5">封面</TableHead>
              <TableHead className="py-3.5 pr-5 pl-2">標題</TableHead>
              <TableHead className="w-52 px-5 py-3.5">分類</TableHead>
              <TableHead className="w-24 px-5 py-3.5">狀態</TableHead>
              <TableHead className="w-28 px-5 py-3.5 text-right">瀏覽數</TableHead>
              <TableHead className="w-36 px-5 py-3.5">最後更新</TableHead>
              <TableHead className="w-40 px-5 py-3.5 text-right">
                <span className="sr-only">操作</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{posts.map(renderRow)}</TableBody>
        </Table>
        <PostsPagination params={params} total={total} pageCount={pageCount} />
      </div>

      {maybeRenderBulkBar()}

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">{maybeRenderDeleteDialogContent()}</DialogContent>
      </Dialog>
    </div>
  )
}
