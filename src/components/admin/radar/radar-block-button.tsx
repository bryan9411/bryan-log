"use client"

import { useState, useTransition } from "react"
import { EyeOffIcon, Loader2Icon, Undo2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ACTION_STATUS } from "@/lib/actions/action-state"
import { setRadarItemBlockedAction } from "@/lib/actions/radar"

type RadarBlockButtonProps = {
  id: string
  title: string
  // true：目前在榜單上，按下後隱藏；false：在已隱藏清單，按下後還原
  block: boolean
}

// 成功後 Server Action 會重新驗證頁面，項目自動移到另一個分頁；失敗時在按鈕旁顯示原因
export function RadarBlockButton({ id, title, block }: RadarBlockButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const Icon = isPending ? Loader2Icon : block ? EyeOffIcon : Undo2Icon

  const handleClick = () => {
    setError(null)
    startTransition(async () => {
      const result = await setRadarItemBlockedAction(id, block)
      if (result.status === ACTION_STATUS.ERROR) setError(result.message)
    })
  }

  const maybeRenderError = () => {
    if (!error) return null
    return (
      <span role="alert" className="text-xs text-destructive">
        {error}
      </span>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={handleClick}
        aria-label={`${block ? "隱藏" : "還原"}「${title}」`}
      >
        <Icon className={isPending ? "animate-spin" : undefined} aria-hidden />
        {block ? "隱藏" : "還原"}
      </Button>
      {maybeRenderError()}
    </div>
  )
}
