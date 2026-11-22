"use client"

import { useState, useTransition } from "react"
import { BookmarkCheckIcon, BookmarkPlusIcon, Loader2Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ACTION_STATUS } from "@/lib/actions/action-state"
import { collectRadarItemAction } from "@/lib/actions/radar-collections"

type RadarCollectButtonProps = {
  id: string
  title: string
  // 已收藏時為收藏編號（第 2 階段改成連到收藏詳細頁）
  collectionId: string | null
}

// 不提供在榜單上取消收藏，避免誤刪筆記；成功後 Server Action 重新驗證頁面，按鈕變成「已收藏」徽章
export function RadarCollectButton({ id, title, collectionId }: RadarCollectButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (collectionId) {
    return (
      <Badge variant="secondary" className="h-8 gap-1.5 px-2.5 font-normal">
        <BookmarkCheckIcon aria-hidden />
        已收藏
      </Badge>
    )
  }

  const Icon = isPending ? Loader2Icon : BookmarkPlusIcon

  const handleClick = () => {
    setError(null)
    startTransition(async () => {
      const result = await collectRadarItemAction(id)
      if (result.status === ACTION_STATUS.ERROR) setError(result.message)
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={handleClick}
        aria-label={`收藏「${title}」`}
      >
        <Icon className={isPending ? "animate-spin" : undefined} aria-hidden />
        收藏
      </Button>
      {error ? (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  )
}
