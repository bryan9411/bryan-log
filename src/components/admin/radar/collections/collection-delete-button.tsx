"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Loader2Icon, Trash2Icon } from "lucide-react"

import { FormMessage } from "@/components/forms/form-message"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ROUTES } from "@/config/routes"
import { ACTION_STATUS, initialActionState, type ActionState } from "@/lib/actions/action-state"
import { deleteRadarCollectionAction } from "@/lib/actions/radar-collections"

type CollectionDeleteButtonProps = {
  id: string
  title: string
}

export function CollectionDeleteButton({ id, title }: CollectionDeleteButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<ActionState>(initialActionState)

  const handleOpenChange = (open: boolean) => {
    if (isPending) return
    setIsOpen(open)
    if (open) setResult(initialActionState)
  }

  const handleDelete = () => {
    startTransition(async () => {
      const response = await deleteRadarCollectionAction(id)
      if (response.status === ACTION_STATUS.ERROR) {
        setResult(response)
        return
      }
      router.replace(ROUTES.ADMIN_RADAR_COLLECTIONS)
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="text-destructive hover:text-destructive">
          <Trash2Icon aria-hidden />
          刪除收藏
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="break-all">確定要刪除「{title}」的收藏嗎？</DialogTitle>
          <DialogDescription>
            筆記、標籤、研究狀態與收藏當下的快照會一併刪除，此動作無法復原。項目若仍在榜單上，可以重新收藏，但快照會改為重新收藏的當下。
          </DialogDescription>
        </DialogHeader>
        <FormMessage state={result} />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => setIsOpen(false)}
          >
            取消
          </Button>
          <Button type="button" variant="destructive" disabled={isPending} onClick={handleDelete}>
            {isPending ? (
              <Loader2Icon className="animate-spin" aria-hidden />
            ) : (
              <Trash2Icon aria-hidden />
            )}
            確定刪除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
