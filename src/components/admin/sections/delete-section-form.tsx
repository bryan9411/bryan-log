"use client"

import { useActionState } from "react"

import { FormMessage } from "@/components/forms/form-message"
import { SubmitButton } from "@/components/forms/submit-button"
import { Button } from "@/components/ui/button"
import { DialogClose, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { ACTION_STATUS, initialActionState } from "@/lib/actions/action-state"
import { deleteSectionAction, type DeleteSectionState } from "@/lib/actions/sections"
import type { AdminSection } from "@/lib/data/sections"

type DeleteSectionFormProps = {
  section: AdminSection
  onSuccess: (message: string) => void
}

// 前端先依目前資料擋下；伺服器動作與資料庫外鍵仍會再檢查一次
export function DeleteSectionForm({ section, onSuccess }: DeleteSectionFormProps) {
  const [state, formAction] = useActionState<DeleteSectionState, FormData>(
    async (previousState, formData) => {
      const result = await deleteSectionAction(previousState, formData)
      if (result.status === ACTION_STATUS.SUCCESS && result.message) onSuccess(result.message)
      return result
    },
    initialActionState,
  )

  const { id, postCount, categoryCount } = section

  if (postCount > 0 || categoryCount > 0) {
    return (
      <>
        <DialogDescription>
          此區塊底下還有 {postCount} 篇文章、{categoryCount}{" "}
          個分類，無法直接刪除。請先刪除這些文章與分類，再刪除此區塊。
        </DialogDescription>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button">我知道了</Button>
          </DialogClose>
        </DialogFooter>
      </>
    )
  }

  return (
    <form action={formAction} className="grid gap-5">
      <input type="hidden" name="id" value={id} />
      <DialogDescription>
        此區塊目前沒有任何文章與分類。刪除後前台導覽列與列表頁會一併移除，此動作無法復原。
      </DialogDescription>
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
