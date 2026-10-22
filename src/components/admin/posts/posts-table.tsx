import { FileTextIcon, SearchXIcon } from "lucide-react"

import { PostsTableView } from "@/components/admin/posts/posts-table-view"
import { EmptyState } from "@/components/empty-state"
import { listAdminPosts } from "@/lib/data/posts"
import { getRequestTime } from "@/lib/request-time"
import { hasActivePostFilters, parseAdminPostListParams } from "@/lib/validations/admin-post-list"

type PostsTableProps = {
  searchParams: PageProps<"/admin/posts">["searchParams"]
}

export async function PostsTable({ searchParams }: PostsTableProps) {
  const params = parseAdminPostListParams(await searchParams)
  // 相對時間需要讀取目前時間，getRequestTime 會先呼叫 connection() 宣告為請求期間渲染
  const [list, now] = await Promise.all([listAdminPosts(params), getRequestTime()])

  if (list.total === 0) {
    if (hasActivePostFilters(params)) {
      return (
        <EmptyState
          icon={SearchXIcon}
          title="找不到符合條件的文章"
          description="試著換個關鍵字，或切換狀態篩選為「全部」。"
        />
      )
    }

    return (
      <EmptyState
        icon={FileTextIcon}
        title="還沒有任何文章"
        description="點擊右上角的「新增文章」開始撰寫第一篇技術文章。"
      />
    )
  }

  return <PostsTableView {...list} params={{ ...params, page: list.page }} now={now} />
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
