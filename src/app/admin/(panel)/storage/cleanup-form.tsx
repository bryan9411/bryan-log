"use client"

import { useActionState } from "react"
import { Trash2Icon } from "lucide-react"

import { FormMessage } from "@/components/forms/form-message"
import { SubmitButton } from "@/components/forms/submit-button"
import { initialActionState } from "@/lib/actions/action-state"
import { cleanupOrphansAction, type CleanupState } from "@/lib/actions/storage"

type CleanupFormProps = {
  orphanCount: number
}

export function CleanupForm({ orphanCount }: CleanupFormProps) {
  const [state, formAction] = useActionState<CleanupState, FormData>(
    cleanupOrphansAction,
    initialActionState,
  )

  const confirmError = state.fieldErrors?.confirm?.[0]
  const isEmpty = orphanCount === 0

  const maybeRenderConfirmError = () => {
    if (!confirmError) return null
    return <p className="text-sm text-destructive">{confirmError}</p>
  }

  return (
    <form action={formAction} className="grid gap-4">
      <FormMessage state={state} />

      <label className="flex items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          name="confirm"
          className="mt-0.5 size-4 accent-foreground"
          aria-invalid={Boolean(confirmError)}
          disabled={isEmpty}
        />
        <span>我了解孤兒檔案刪除後將無法復原</span>
      </label>
      {maybeRenderConfirmError()}

      <div>
        <SubmitButton variant="destructive" pendingText="清理中…" disabled={isEmpty}>
          <Trash2Icon aria-hidden />
          清理 {orphanCount} 個孤兒檔案
        </SubmitButton>
      </div>
    </form>
  )
}
