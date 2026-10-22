"use client"

import { useActionState } from "react"

import { FormMessage } from "@/components/forms/form-message"
import { SubmitButton } from "@/components/forms/submit-button"
import { Button } from "@/components/ui/button"
import { DialogClose, DialogFooter } from "@/components/ui/dialog"
import { ACTION_STATUS, initialActionState } from "@/lib/actions/action-state"
import { deletePostsAction, type DeletePostsState } from "@/lib/actions/posts"
import { DELETE_POSTS_FIELD } from "@/lib/validations/admin-post-list"

// 批次刪除時列出的標題數量上限，其餘以「等 N 篇」帶過，避免對話框過長
const MAX_LISTED_TITLES = 5

export type DeletePostTarget = {
  id: string
  title: string
}

type DeletePostsFormProps = {
  posts: DeletePostTarget[]
  onSuccess: (message: string) => void
}

export function DeletePostsForm({ posts, onSuccess }: DeletePostsFormProps) {
  const [state, formAction, isPending] = useActionState<DeletePostsState, FormData>(
    async (previousState, formData) => {
      const result = await deletePostsAction(previousState, formData)
      if (result.status === ACTION_STATUS.SUCCESS && result.message) onSuccess(result.message)
      return result
    },
    initialActionState,
  )

  const listedPosts = posts.slice(0, MAX_LISTED_TITLES)
  const hiddenCount = posts.length - listedPosts.length

  const maybeRenderTitleList = () => {
    if (posts.length <= 1) return null

    return (
      <ul className="grid gap-1 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
        {listedPosts.map((post) => (
          <li key={post.id} className="truncate" title={post.title}>
            {post.title}
          </li>
        ))}
        {hiddenCount > 0 ? (
          <li className="text-muted-foreground">…等其他 {hiddenCount} 篇</li>
        ) : null}
      </ul>
    )
  }

  return (
    <form action={formAction} className="grid gap-5">
      {posts.map((post) => (
        <input key={post.id} type="hidden" name={DELETE_POSTS_FIELD} value={post.id} />
      ))}
      {maybeRenderTitleList()}
      <FormMessage state={state} />
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={isPending}>
            取消
          </Button>
        </DialogClose>
        <SubmitButton variant="destructive" pendingText="刪除中…">
          {posts.length > 1 ? `確定刪除 ${posts.length} 篇` : "確定刪除"}
        </SubmitButton>
      </DialogFooter>
    </form>
  )
}
