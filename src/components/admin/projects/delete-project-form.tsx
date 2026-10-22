"use client"

import { useActionState } from "react"

import { FormMessage } from "@/components/forms/form-message"
import { SubmitButton } from "@/components/forms/submit-button"
import { Button } from "@/components/ui/button"
import { DialogClose, DialogFooter } from "@/components/ui/dialog"
import { ACTION_STATUS, initialActionState } from "@/lib/actions/action-state"
import { deleteProjectAction, type DeleteProjectState } from "@/lib/actions/projects"

type DeleteProjectFormProps = {
  projectId: string
  onSuccess: (message: string) => void
}

export function DeleteProjectForm({ projectId, onSuccess }: DeleteProjectFormProps) {
  const [state, formAction, isPending] = useActionState<DeleteProjectState, FormData>(
    async (previousState, formData) => {
      const result = await deleteProjectAction(previousState, formData)
      if (result.status === ACTION_STATUS.SUCCESS && result.message) onSuccess(result.message)
      return result
    },
    initialActionState,
  )

  return (
    <form action={formAction} className="grid gap-5">
      <input type="hidden" name="id" value={projectId} />
      <FormMessage state={state} />
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={isPending}>
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
