"use client"

import { useState } from "react"
import { FolderTreeIcon, PlusIcon } from "lucide-react"

import { CategoryForm } from "@/components/admin/categories/category-form"
import { CategoryTree } from "@/components/admin/categories/category-tree"
import { DeleteCategoryForm } from "@/components/admin/categories/delete-category-form"
import { EmptyState } from "@/components/empty-state"
import { FormMessage } from "@/components/forms/form-message"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ACTION_STATUS } from "@/lib/actions/action-state"
import {
  CATEGORY_TAB_LABEL,
  CATEGORY_TYPE,
  categoryTypeSchema,
  type CategoryType,
} from "@/lib/constants/content"
import type {
  AdminCategory,
  AdminCategoryNode,
  AdminCategoryTrees,
} from "@/lib/data/admin-categories"

const CATEGORY_TYPES = categoryTypeSchema.options

type FormDialogState = {
  type: CategoryType
  category: AdminCategory | null
  defaultParentId: string | null
}

type CategoryManagerProps = {
  trees: AdminCategoryTrees
}

function countCategories(nodes: AdminCategoryNode[]) {
  return nodes.reduce((total, node) => total + 1 + node.children.length, 0)
}

// 子分類沒有下層，只有父分類需要查找其子分類數量
function findChildCount(nodes: AdminCategoryNode[], categoryId: string) {
  return nodes.find((node) => node.id === categoryId)?.children.length ?? 0
}

export function CategoryManager({ trees }: CategoryManagerProps) {
  const [activeType, setActiveType] = useState<CategoryType>(CATEGORY_TYPE.POST)
  // 對話框內容與開關狀態分開保存：關閉動畫播放期間內容仍保留，不會閃成空白
  const [formDialog, setFormDialog] = useState<FormDialogState | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  // 每次開啟表單遞增，作為表單的 key，確保重新開啟時欄位與錯誤訊息都是乾淨的狀態
  const [formSession, setFormSession] = useState(0)
  const [deleting, setDeleting] = useState<AdminCategory | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const openForm = (dialog: FormDialogState) => {
    setNotice(null)
    setFormDialog(dialog)
    setFormSession((session) => session + 1)
    setIsFormOpen(true)
  }

  const openDelete = (category: AdminCategory) => {
    setNotice(null)
    setDeleting(category)
    setIsDeleteOpen(true)
  }

  const handleSuccess = (message: string) => {
    setIsFormOpen(false)
    setIsDeleteOpen(false)
    setNotice(message)
  }

  const renderTabContent = (type: CategoryType) => {
    const nodes = trees[type]

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
          onEdit={(category) => openForm({ type, category, defaultParentId: null })}
          onDelete={openDelete}
          onAddChild={(parent) => openForm({ type, category: null, defaultParentId: parent.id })}
        />
      )
    }

    return (
      <TabsContent key={type} value={type} className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            共 {countCategories(nodes)} 個分類，最多兩層；刪除分類後，所屬內容會變為未分類
          </p>
          <Button onClick={() => openForm({ type, category: null, defaultParentId: null })}>
            <PlusIcon aria-hidden />
            新增分類
          </Button>
        </div>
        {maybeRenderTree()}
      </TabsContent>
    )
  }

  const maybeRenderNotice = () => {
    if (!notice) return null
    return <FormMessage state={{ status: ACTION_STATUS.SUCCESS, message: notice }} />
  }

  const maybeRenderFormDialogContent = () => {
    if (!formDialog) return null

    const { type, category, defaultParentId } = formDialog
    const nodes = trees[type]

    return (
      <>
        <DialogHeader>
          <DialogTitle>{category ? `編輯「${category.name}」` : "新增分類"}</DialogTitle>
          <DialogDescription>{CATEGORY_TAB_LABEL[type]}</DialogDescription>
        </DialogHeader>
        <CategoryForm
          key={formSession}
          type={type}
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
          childCount={findChildCount(trees[deleting.type], deleting.id)}
          onSuccess={handleSuccess}
        />
      </>
    )
  }

  return (
    <div className="grid gap-5">
      {maybeRenderNotice()}

      <Tabs
        value={activeType}
        onValueChange={(value) => setActiveType(categoryTypeSchema.parse(value))}
      >
        <TabsList aria-label="分類類型">
          {CATEGORY_TYPES.map((type) => (
            <TabsTrigger key={type} value={type}>
              {CATEGORY_TAB_LABEL[type]}
              <span className="text-xs text-muted-foreground tabular-nums">
                {countCategories(trees[type])}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="mt-4">{CATEGORY_TYPES.map(renderTabContent)}</div>
      </Tabs>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>{maybeRenderFormDialogContent()}</DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">{maybeRenderDeleteDialogContent()}</DialogContent>
      </Dialog>
    </div>
  )
}
