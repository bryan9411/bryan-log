"use client"

import { useActionState, useEffect, useState } from "react"
import { Trash2Icon } from "lucide-react"

import { SubmitButton } from "@/components/forms/submit-button"
import { Button } from "@/components/ui/button"
import { ACTION_STATUS, initialActionState } from "@/lib/actions/action-state"
import { deletePostAction, type DeletePostState } from "@/lib/actions/posts"

const CONFIRM_TIMEOUT_MS = 4000

type DeletePostButtonProps = {
  postId: string
  postTitle: string
}

// 兩段式確認：第一次點擊只切換為「確定刪除？」，避免誤觸造成無法復原的刪除
export function DeletePostButton({ postId, postTitle }: DeletePostButtonProps) {
  const [state, formAction] = useActionState<DeletePostState, FormData>(
    deletePostAction,
    initialActionState,
  )
  const [isConfirming, setIsConfirming] = useState(false)

  useEffect(() => {
    if (!isConfirming) return
    const timer = window.setTimeout(() => setIsConfirming(false), CONFIRM_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [isConfirming])

  const errorMessage = state.status === ACTION_STATUS.ERROR ? state.message : null

  const maybeRenderError = () => {
    if (!errorMessage) return null
    return (
      <p role="alert" className="text-xs text-destructive">
        {errorMessage}
      </p>
    )
  }

  const renderTrigger = () => {
    if (isConfirming) {
      return (
        <SubmitButton variant="destructive" size="sm" pendingText="刪除中…">
          確定刪除？
        </SubmitButton>
      )
    }

    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={`刪除「${postTitle}」`}
        onClick={() => setIsConfirming(true)}
      >
        <Trash2Icon aria-hidden />
        刪除
      </Button>
    )
  }

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="id" value={postId} />
      {renderTrigger()}
      {maybeRenderError()}
    </form>
  )
}
