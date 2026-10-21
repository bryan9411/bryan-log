"use client"

import { useActionState } from "react"

import { FormMessage } from "@/components/forms/form-message"
import { SubmitButton } from "@/components/forms/submit-button"
import { Button } from "@/components/ui/button"
import { DialogClose, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { ACTION_STATUS, initialActionState } from "@/lib/actions/action-state"
import { deleteCategoryAction, type DeleteCategoryState } from "@/lib/actions/categories"
import { CATEGORY_CONTENT_UNIT } from "@/lib/constants/content"
import type { AdminCategory } from "@/lib/data/admin-categories"

type DeleteCategoryFormProps = {
  category: AdminCategory
  childCount: number
  onSuccess: (message: string) => void
}

// 前端先依目前資料擋下或提示；伺服器動作與資料庫外鍵仍會再檢查一次
export function DeleteCategoryForm({ category, childCount, onSuccess }: DeleteCategoryFormProps) {
  const [state, formAction] = useActionState<DeleteCategoryState, FormData>(
    async (previousState, formData) => {
      const result = await deleteCategoryAction(previousState, formData)
      if (result.status === ACTION_STATUS.SUCCESS && result.message) onSuccess(result.message)
      return result
    },
    initialActionState,
  )

  const { id, type, contentCount } = category
  const unit = CATEGORY_CONTENT_UNIT[type]

  if (childCount > 0) {
    return (
      <>
        <DialogDescription>
          此分類底下還有 {childCount} 個子分類，無法直接刪除。請先移除或轉移子分類，再刪除此分類。
        </DialogDescription>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button">我知道了</Button>
          </DialogClose>
        </DialogFooter>
      </>
    )
  }

  const description =
    contentCount > 0
      ? `目前有 ${contentCount} ${unit}屬於此分類，刪除後將變為未分類。此動作無法復原。`
      : "此分類目前沒有任何關聯內容。刪除後無法復原。"

  return (
    <form action={formAction} className="grid gap-5">
      <input type="hidden" name="id" value={id} />
      <DialogDescription>{description}</DialogDescription>
      <FormMessage state={state} />
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            取消
          </Button>
        </DialogClose>
        <SubmitButton variant="destructive" pendingText="刪除中…">
          確定刪除
        </SubmitButton>
      </DialogFooter>
    </form>
  )
}
