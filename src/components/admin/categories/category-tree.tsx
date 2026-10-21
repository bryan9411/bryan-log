"use client"

import { CornerDownRightIcon, FolderIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CATEGORY_CONTENT_UNIT, formatCategoryContentCount } from "@/lib/constants/content"
import type { AdminCategory, AdminCategoryNode } from "@/lib/data/admin-categories"
import { cn } from "@/lib/utils"

type CategoryTreeProps = {
  nodes: AdminCategoryNode[]
  onEdit: (category: AdminCategory) => void
  onDelete: (category: AdminCategory) => void
  onAddChild: (parent: AdminCategoryNode) => void
}

type CategoryRowProps = Omit<CategoryTreeProps, "nodes" | "onAddChild"> & {
  category: AdminCategory
  isChild: boolean
  childCount?: number
  childContentCount?: number
  onAddChild?: () => void
}

function CategoryRow({
  category,
  isChild,
  childCount = 0,
  childContentCount = 0,
  onEdit,
  onDelete,
  onAddChild,
}: CategoryRowProps) {
  const { type, name, slug, description, sortOrder, contentCount } = category
  const Icon = isChild ? CornerDownRightIcon : FolderIcon

  const maybeRenderDescription = () => {
    if (!description) return null
    return <p className="truncate text-xs text-muted-foreground">{description}</p>
  }

  const maybeRenderChildCount = () => {
    if (isChild || childCount === 0) return null
    // 父分類右側的數量只計算直接歸屬的內容，這裡補上子分類的合計，避免誤以為整個分類是空的
    return (
      <span className="text-xs text-muted-foreground">
        {childCount} 個子分類・共 {childContentCount} {CATEGORY_CONTENT_UNIT[type]}
      </span>
    )
  }

  const maybeRenderAddChild = () => {
    if (!onAddChild) return null

    return (
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`在「${name}」底下新增子分類`}
        title="新增子分類"
        onClick={onAddChild}
      >
        <PlusIcon />
      </Button>
    )
  }

  return (
    <div
      className={cn(
        "grid items-center gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]",
        isChild && "bg-muted/30 pl-10 sm:pl-12",
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <Icon
          className={cn(
            "mt-0.5 size-4 shrink-0",
            isChild ? "text-muted-foreground" : "text-foreground/70",
          )}
          aria-hidden
        />
        <div className="grid min-w-0 gap-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className={cn("truncate", isChild ? "text-sm" : "font-medium")}>{name}</span>
            <code className="rounded bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
              {slug}
            </code>
            {maybeRenderChildCount()}
          </div>
          {maybeRenderDescription()}
        </div>
      </div>
      <div className="flex items-center gap-3 pl-6.5 text-xs text-muted-foreground sm:pl-0">
        <span className="tabular-nums" title="排序權重">
          排序 {sortOrder}
        </span>
        <Badge
          variant={contentCount > 0 ? "secondary" : "outline"}
          className="font-normal tabular-nums"
        >
          {formatCategoryContentCount(type, contentCount)}
        </Badge>
      </div>
      <div className="flex items-center justify-end gap-0.5">
        {maybeRenderAddChild()}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`編輯「${name}」`}
          title="編輯"
          onClick={() => onEdit(category)}
        >
          <PencilIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`刪除「${name}」`}
          title="刪除"
          onClick={() => onDelete(category)}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2Icon />
        </Button>
      </div>
    </div>
  )
}

// 父分類一列，其下以縮排列出子分類；每個父分類群組之間以分隔線區隔
export function CategoryTree({ nodes, onEdit, onDelete, onAddChild }: CategoryTreeProps) {
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-background">
      {nodes.map((node) => (
        <li key={node.id}>
          <CategoryRow
            category={node}
            isChild={false}
            childCount={node.children.length}
            childContentCount={node.children.reduce(
              (total, child) => total + child.contentCount,
              0,
            )}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={() => onAddChild(node)}
          />
          {node.children.length > 0 && (
            <ul aria-label={`${node.name}的子分類`} className="divide-y border-t border-dashed">
              {node.children.map((child) => (
                <li key={child.id}>
                  <CategoryRow category={child} isChild onEdit={onEdit} onDelete={onDelete} />
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  )
}
