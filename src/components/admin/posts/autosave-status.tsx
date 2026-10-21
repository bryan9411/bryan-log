"use client"

import { CloudAlertIcon, HistoryIcon } from "lucide-react"

import { AUTOSAVE_INTERVAL_MS } from "@/hooks/use-autosave"
import { useNow } from "@/hooks/use-now"
import { formatRelativeTime } from "@/lib/format"

const TICK_INTERVAL_MS = 1000
const AUTOSAVE_INTERVAL_SECONDS = AUTOSAVE_INTERVAL_MS / 1000

type AutosaveStatusProps = {
  lastSavedAt: number | null
  hasStorageError: boolean
}

export function AutosaveStatus({ lastSavedAt, hasStorageError }: AutosaveStatusProps) {
  const now = useNow(TICK_INTERVAL_MS)

  const getLabel = () => {
    if (lastSavedAt === null || now === null) {
      return `每 ${AUTOSAVE_INTERVAL_SECONDS} 秒自動暫存至此瀏覽器`
    }
    // 「0 秒前」不自然，剛存完時直接顯示「剛剛」
    if (now - lastSavedAt < TICK_INTERVAL_MS) return "已於剛剛自動暫存"

    return `已於 ${formatRelativeTime(lastSavedAt, now)}自動暫存`
  }

  if (hasStorageError) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-destructive" role="status">
        <CloudAlertIcon className="size-3.5" aria-hidden />
        無法寫入瀏覽器暫存（可能為無痕模式或空間已滿）
      </p>
    )
  }

  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <HistoryIcon className="size-3.5" aria-hidden />
      {getLabel()}
    </p>
  )
}
