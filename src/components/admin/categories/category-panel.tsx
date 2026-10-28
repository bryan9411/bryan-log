"use client"

import { useState } from "react"
import { FolderTreeIcon, PlusIcon } from "lucide-react"

import { CategoryForm } from "@/components/admin/categories/category-form"
import { CategoryTree } from "@/components/admin/categories/category-tree"
import { DeleteCategoryForm } from "@/components/admin/categories/delete-category-form"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { CategoryType } from "@/lib/constants/content"
import type { AdminCategory, AdminCategoryNode } from "@/lib/data/admin-categories"

type FormDialogState = {
  category: AdminCategory | null
  defaultParentId: string | null
}

type CategoryPanelProps = {
  type: CategoryType
  // 文章分類所屬的內容區塊；作品分類為 null
  sectionId: string | null
  // 對話框副標題，例如「技術文章」的分類
  scopeLabel: string
  nodes: AdminCategoryNode[]
  onSuccess: (message: string) => void
}

export function countCategories(nodes: AdminCategoryNode[]) {
  return nodes.reduce((total, node) => total + 1 + node.children.length, 0)
}

// 子分類沒有下層，只有父分類需要查找其子分類數量
function findChildCount(nodes: AdminCategoryNode[], categoryId: string) {
  return nodes.find((node) => node.id === categoryId)?.children.length ?? 0
}

// 單一範圍（某個內容區塊，或作品集）的雙層分類：清單、新增／編輯對話框與刪除確認
export function CategoryPanel({
  type,
  sectionId,
  scopeLabel,
  nodes,
  onSuccess,
}: CategoryPanelProps) {
  // 對話框內容與開關狀態分開保存：關閉動畫播放期間內容仍保留，不會閃成空白
  const [formDialog, setFormDialog] = useState<FormDialogState | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  // 每次開啟表單遞增，作為表單的 key，確保重新開啟時欄位與錯誤訊息都是乾淨的狀態
  const [formSession, setFormSession] = useState(0)
  const [deleting, setDeleting] = useState<AdminCategory | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const openForm = (dialog: FormDialogState) => {
    setFormDialog(dialog)
    setFormSession((session) => session + 1)
    setIsFormOpen(true)
  }

  const openDelete = (category: AdminCategory) => {
    setDeleting(category)
    setIsDeleteOpen(true)
  }

  const handleSuccess = (message: string) => {
    setIsFormOpen(false)
    setIsDeleteOpen(false)
    onSuccess(message)
  }

  const maybeRenderTree = () => {
    if (nodes.length === 0) {
      return (
        <EmptyState
          icon={FolderTreeIcon}
          title="尚未建立分類"
          description="新增第一個父分類後，就能在底下建立子分類。"
        />
      )
    }

    return (
      <CategoryTree
        nodes={nodes}
        onEdit={(category) => openForm({ category, defaultParentId: null })}
        onDelete={openDelete}
        onAddChild={(parent) => openForm({ category: null, defaultParentId: parent.id })}
      />
    )
  }

  const maybeRenderFormDialogContent = () => {
    if (!formDialog) return null

    const { category, defaultParentId } = formDialog

    return (
      <>
        <DialogHeader>
          <DialogTitle>{category ? `編輯「${category.name}」` : "新增分類"}</DialogTitle>
          <DialogDescription>「{scopeLabel}」的分類</DialogDescription>
        </DialogHeader>
        <CategoryForm
          key={formSession}
          type={type}
          sectionId={sectionId}
          category={category}
          defaultParentId={defaultParentId}
          parents={nodes}
          childCount={category ? findChildCount(nodes, category.id) : 0}
          onSuccess={handleSuccess}
        />
      </>
    )
  }

  const maybeRenderDeleteDialogContent = () => {
    if (!deleting) return null

    return (
      <>
        <DialogHeader>
          <DialogTitle>刪除「{deleting.name}」？</DialogTitle>
        </DialogHeader>
        <DeleteCategoryForm
          key={deleting.id}
          category={deleting}
          childCount={findChildCount(nodes, deleting.id)}
          onSuccess={handleSuccess}
        />
      </>
    )
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          共 {countCategories(nodes)}{" "}
          個分類，最多兩層；同一層名稱不可重複，刪除分類後所屬內容會變為未分類
        </p>
        <Button onClick={() => openForm({ category: null, defaultParentId: null })}>
          <PlusIcon aria-hidden />
          新增分類
        </Button>
      </div>
      {maybeRenderTree()}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>{maybeRenderFormDialogContent()}</DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">{maybeRenderDeleteDialogContent()}</DialogContent>
      </Dialog>
    </div>
  )
}
