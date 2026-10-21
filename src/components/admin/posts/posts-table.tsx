import Link from "next/link"
import { FileTextIcon, PencilIcon } from "lucide-react"

import { AdminEmptyState } from "@/components/admin/admin-empty-state"
import { DeletePostButton } from "@/components/admin/posts/delete-post-button"
import { PostStatusBadge } from "@/components/admin/posts/post-status-badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { adminEditPostRoute } from "@/config/routes"
import { listAdminPosts, type AdminPostListItem } from "@/lib/data/posts"
import { formatDateTime, formatRelativeTime } from "@/lib/format"
import { getRequestTime } from "@/lib/request-time"

export async function PostsTable() {
  // 相對時間需要讀取目前時間，getRequestTime 會先呼叫 connection() 宣告為請求期間渲染
  const [posts, now] = await Promise.all([listAdminPosts(), getRequestTime()])

  const renderCategory = (post: AdminPostListItem) => {
    if (!post.categoryName) return <span className="text-muted-foreground">未分類</span>

    return (
      <span>
        {post.parentCategoryName ? (
          <span className="text-muted-foreground">{post.parentCategoryName} / </span>
        ) : null}
        {post.categoryName}
      </span>
    )
  }

  const renderRow = (post: AdminPostListItem) => (
    <TableRow key={post.id}>
      <TableCell className="max-w-80">
        <Link
          href={adminEditPostRoute(post.id)}
          className="block truncate font-medium hover:underline"
          title={post.title}
        >
          {post.title}
        </Link>
        <span className="block truncate font-mono text-xs text-muted-foreground">/{post.slug}</span>
      </TableCell>
      <TableCell className="text-sm">{renderCategory(post)}</TableCell>
      <TableCell>
        <PostStatusBadge status={post.status} />
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {post.viewCount.toLocaleString("zh-TW")}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        <time dateTime={post.updatedAt} title={formatDateTime(post.updatedAt)}>
          {formatRelativeTime(post.updatedAt, now)}
        </time>
      </TableCell>
      <TableCell>
        <div className="flex items-start justify-end gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href={adminEditPostRoute(post.id)}>
              <PencilIcon aria-hidden />
              編輯
            </Link>
          </Button>
          <DeletePostButton postId={post.id} postTitle={post.title} />
        </div>
      </TableCell>
    </TableRow>
  )

  if (posts.length === 0) {
    return (
      <AdminEmptyState
        icon={FileTextIcon}
        title="還沒有任何文章"
        description="點擊右上角的「新增文章」開始撰寫第一篇技術文章。"
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>標題</TableHead>
            <TableHead>分類</TableHead>
            <TableHead>狀態</TableHead>
            <TableHead className="text-right">瀏覽數</TableHead>
            <TableHead>最後更新</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{posts.map(renderRow)}</TableBody>
      </Table>
    </div>
  )
}

export function PostsTableSkeleton() {
  return (
    <div
      className="h-96 animate-pulse rounded-xl border bg-muted/50"
      aria-busy
      aria-label="文章列表載入中"
    />
  )
}
