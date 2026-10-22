"use client"

import Link from "next/link"
import { useOptimistic, useState, useTransition } from "react"
import { ArrowDownIcon, ArrowUpIcon, PencilIcon, PinIcon, Trash2Icon } from "lucide-react"

import { CoverThumbnail } from "@/components/admin/cover-thumbnail"
import { PostStatusBadge } from "@/components/admin/posts/post-status-badge"
import { DeleteProjectForm } from "@/components/admin/projects/delete-project-form"
import { FormMessage } from "@/components/forms/form-message"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { adminEditProjectRoute } from "@/config/routes"
import { ACTION_STATUS, initialActionState, type ActionState } from "@/lib/actions/action-state"
import { moveProjectAction, setProjectFeaturedAction } from "@/lib/actions/projects"
import type { AdminProjectListItem } from "@/lib/data/admin-projects"
import { formatDateTime, formatRelativeTime } from "@/lib/format"
import { MOVE_DIRECTION, moveItem, type MoveDirection } from "@/lib/validations/project"

// 技術標籤欄位最多顯示的數量，其餘以「+N」帶過
const MAX_VISIBLE_TAGS = 3

const OPTIMISTIC_CHANGE = {
  FEATURED: "featured",
  MOVE: "move",
} as const

type OptimisticChange =
  | { type: typeof OPTIMISTIC_CHANGE.FEATURED; id: string; isFeatured: boolean }
  | { type: typeof OPTIMISTIC_CHANGE.MOVE; id: string; direction: MoveDirection }

function applyChange(current: AdminProjectListItem[], change: OptimisticChange) {
  switch (change.type) {
    case OPTIMISTIC_CHANGE.FEATURED:
      return current.map((project) =>
        project.id === change.id ? { ...project, isFeatured: change.isFeatured } : project,
      )
    case OPTIMISTIC_CHANGE.MOVE:
      return moveItem(current, change.id, change.direction)
  }
}

type ProjectsTableViewProps = {
  projects: AdminProjectListItem[]
  // 由伺服器傳入的請求時間，伺服器與客戶端算出的相對時間一致，不會產生 Hydration 差異
  now: number
}

export function ProjectsTableView({ projects, now }: ProjectsTableViewProps) {
  // 精選開關與排序共用同一個 transition：畫面先樂觀更新，伺服器完成並重新驗證後以最新資料取代
  // 執行期間停用其他排序與開關，確保每次移動都以伺服器上的最新順序計算
  const [isMutating, startMutation] = useTransition()
  const [optimisticProjects, applyOptimisticChange] = useOptimistic(projects, applyChange)

  const [notice, setNotice] = useState<ActionState>(initialActionState)
  // 對話框內容與開關狀態分開保存：關閉動畫播放期間內容仍保留，不會閃成空白
  const [deleting, setDeleting] = useState<AdminProjectListItem | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const featuredCount = optimisticProjects.filter((project) => project.isFeatured).length

  const toggleFeatured = (id: string, isFeatured: boolean) => {
    startMutation(async () => {
      applyOptimisticChange({ type: OPTIMISTIC_CHANGE.FEATURED, id, isFeatured })
      setNotice(await setProjectFeaturedAction(id, isFeatured))
    })
  }

  // 排序成功時不顯示訊息，避免連續調整時訊息不斷閃爍；失敗時樂觀結果會自動還原並提示
  const moveProject = (id: string, direction: MoveDirection) => {
    startMutation(async () => {
      applyOptimisticChange({ type: OPTIMISTIC_CHANGE.MOVE, id, direction })
      const result = await moveProjectAction(id, direction)
      setNotice(result.status === ACTION_STATUS.ERROR ? result : initialActionState)
    })
  }

  const openDelete = (project: AdminProjectListItem) => {
    setNotice(initialActionState)
    setDeleting(project)
    setIsDeleteOpen(true)
  }

  const handleDeleted = (message: string) => {
    setIsDeleteOpen(false)
    setNotice({ status: ACTION_STATUS.SUCCESS, message })
  }

  const renderCategory = (project: AdminProjectListItem) => {
    if (!project.categoryName) return <span className="text-muted-foreground">未分類</span>

    const fullCategoryName = project.parentCategoryName
      ? `${project.parentCategoryName} / ${project.categoryName}`
      : project.categoryName

    return (
      <span className="block truncate" title={fullCategoryName}>
        {project.parentCategoryName ? (
          <span className="text-muted-foreground">{project.parentCategoryName} / </span>
        ) : null}
        {project.categoryName}
      </span>
    )
  }

  const renderTechStack = (techStack: string[]) => {
    if (techStack.length === 0) return <span className="text-muted-foreground">—</span>

    const visibleTags = techStack.slice(0, MAX_VISIBLE_TAGS)
    const hiddenCount = techStack.length - visibleTags.length

    return (
      <span
        className="block truncate font-mono text-xs text-foreground/75"
        title={techStack.join("、")}
      >
        {visibleTags.join(" · ")}
        {hiddenCount > 0 ? <span className="text-muted-foreground"> +{hiddenCount}</span> : null}
      </span>
    )
  }

  const renderSortButtons = (project: AdminProjectListItem, index: number) => (
    <div className="flex items-center gap-0.5">
      <span className="w-6 text-center text-xs text-muted-foreground tabular-nums">
        {index + 1}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={isMutating || index === 0}
        onClick={() => moveProject(project.id, MOVE_DIRECTION.UP)}
        aria-label={`將「${project.title}」上移`}
      >
        <ArrowUpIcon aria-hidden />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={isMutating || index === optimisticProjects.length - 1}
        onClick={() => moveProject(project.id, MOVE_DIRECTION.DOWN)}
        aria-label={`將「${project.title}」下移`}
      >
        <ArrowDownIcon aria-hidden />
      </Button>
    </div>
  )

  const renderRow = (project: AdminProjectListItem, index: number) => (
    <TableRow key={project.id} className="transition-colors hover:bg-muted/40">
      <TableCell className="w-28 py-4 pr-0 pl-4">{renderSortButtons(project, index)}</TableCell>
      <TableCell className="w-24 py-4 pr-2 pl-3">
        <CoverThumbnail src={project.coverImageUrl} />
      </TableCell>
      <TableCell className="py-4 pr-5 pl-2">
        <Link
          href={adminEditProjectRoute(project.id)}
          className="block truncate font-medium text-foreground hover:underline"
          title={project.title}
        >
          {project.title}
        </Link>
        <span className="mt-1 block truncate font-mono text-xs text-muted-foreground">
          /{project.slug}
        </span>
      </TableCell>
      <TableCell className="w-48 px-5 py-4 text-sm text-foreground/80">
        {renderCategory(project)}
      </TableCell>
      <TableCell className="w-52 px-5 py-4">{renderTechStack(project.techStack)}</TableCell>
      <TableCell className="w-24 px-5 py-4">
        <PostStatusBadge status={project.status} />
      </TableCell>
      <TableCell className="w-24 px-5 py-4">
        <Switch
          checked={project.isFeatured}
          disabled={isMutating}
          onCheckedChange={(checked) => toggleFeatured(project.id, checked)}
          aria-label={`將「${project.title}」設為精選`}
        />
      </TableCell>
      <TableCell className="w-32 px-5 py-4 text-sm text-muted-foreground">
        <time dateTime={project.updatedAt} title={formatDateTime(project.updatedAt)}>
          {formatRelativeTime(project.updatedAt, now)}
        </time>
      </TableCell>
      <TableCell className="w-40 px-5 py-4">
        <div className="flex items-center justify-end gap-1.5">
          <Button asChild variant="ghost" size="sm">
            <Link href={adminEditProjectRoute(project.id)}>
              <PencilIcon aria-hidden />
              編輯
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`刪除「${project.title}」`}
            onClick={() => openDelete(project)}
          >
            <Trash2Icon aria-hidden />
            刪除
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )

  const maybeRenderDeleteDialogContent = () => {
    if (!deleting) return null

    return (
      <>
        <DialogHeader>
          <DialogTitle className="break-all">確定要刪除「{deleting.title}」嗎？</DialogTitle>
          <DialogDescription>
            作品資料將一併刪除，前台作品集與首頁精選會同步下架。此動作無法復原。
          </DialogDescription>
        </DialogHeader>
        <DeleteProjectForm key={deleting.id} projectId={deleting.id} onSuccess={handleDeleted} />
      </>
    )
  }

  return (
    <div className="grid gap-4">
      <FormMessage state={notice} />

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table className="min-w-[1180px] table-fixed">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-28 py-3.5 pr-0 pl-4">排序</TableHead>
              <TableHead className="w-24 py-3.5 pr-2 pl-3">預覽圖</TableHead>
              <TableHead className="py-3.5 pr-5 pl-2">名稱</TableHead>
              <TableHead className="w-48 px-5 py-3.5">分類</TableHead>
              <TableHead className="w-52 px-5 py-3.5">技術標籤</TableHead>
              <TableHead className="w-24 px-5 py-3.5">狀態</TableHead>
              <TableHead className="w-24 px-5 py-3.5">
                <span className="inline-flex items-center gap-1">
                  <PinIcon className="size-3.5" aria-hidden />
                  精選
                </span>
              </TableHead>
              <TableHead className="w-32 px-5 py-3.5">最後更新</TableHead>
              <TableHead className="w-40 px-5 py-3.5 text-right">
                <span className="sr-only">操作</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{optimisticProjects.map(renderRow)}</TableBody>
        </Table>
        <p className="border-t px-5 py-3.5 text-sm text-muted-foreground tabular-nums">
          共 {optimisticProjects.length} 個作品，其中 {featuredCount}{" "}
          個為精選。前台作品集與首頁精選區皆依此排序由上而下顯示
        </p>
      </div>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">{maybeRenderDeleteDialogContent()}</DialogContent>
      </Dialog>
    </div>
  )
}
