"use client"

import { ArchiveRestoreIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatDateTime } from "@/lib/format"

type RestoreBackupBannerProps = {
  savedAt: number
  onRestore: () => void
  onDiscard: () => void
}

export function RestoreBackupBanner({ savedAt, onRestore, onDiscard }: RestoreBackupBannerProps) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm"
    >
      <p className="flex items-center gap-2">
        <ArchiveRestoreIcon className="size-4 shrink-0" aria-hidden />
        發現 {formatDateTime(new Date(savedAt))} 的自動暫存內容，比目前版本更新，是否要還原？
      </p>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onDiscard}>
          捨棄暫存
        </Button>
        <Button type="button" size="sm" onClick={onRestore}>
          還原暫存
        </Button>
      </div>
    </div>
  )
}
