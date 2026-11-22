"use client"

import { useState, useTransition } from "react"
import { Loader2Icon } from "lucide-react"

import { NativeSelect } from "@/components/forms/native-select"
import { RADAR_COLLECTION_STATUS_LABEL, type RadarCollectionStatus } from "@/config/radar"
import { ACTION_STATUS } from "@/lib/actions/action-state"
import { updateRadarCollectionAction } from "@/lib/actions/radar-collections"
import { RADAR_COLLECTION_STATUSES } from "@/lib/validations/radar-collection"

type CollectionStatusSelectProps = {
  id: string
  title: string
  status: RadarCollectionStatus
}

// 列表上直接切換研究狀態：選了就儲存，失敗時退回原本的狀態並顯示錯誤
export function CollectionStatusSelect({ id, title, status }: CollectionStatusSelectProps) {
  const [isPending, startTransition] = useTransition()
  const [value, setValue] = useState(status)
  const [syncedStatus, setSyncedStatus] = useState(status)
  const [error, setError] = useState<string | null>(null)

  // 伺服器重新驗證後帶來新的狀態（例如在詳細頁改過）時，同步為最新值
  if (status !== syncedStatus) {
    setSyncedStatus(status)
    setValue(status)
  }

  const handleChange = (next: RadarCollectionStatus) => {
    const previous = value
    setValue(next)
    setError(null)
    startTransition(async () => {
      const result = await updateRadarCollectionAction(id, { status: next })
      if (result.status === ACTION_STATUS.ERROR) {
        setValue(previous)
        setError(result.message)
      }
    })
  }

  return (
    <div className="grid gap-1">
      <div className="flex items-center gap-1.5">
        <NativeSelect
          aria-label={`「${title}」的研究狀態`}
          value={value}
          disabled={isPending}
          onChange={(event) => handleChange(event.target.value as RadarCollectionStatus)}
          className="h-8 w-28"
        >
          {RADAR_COLLECTION_STATUSES.map((option) => (
            <option key={option} value={option}>
              {RADAR_COLLECTION_STATUS_LABEL[option]}
            </option>
          ))}
        </NativeSelect>
        {isPending ? (
          <Loader2Icon className="size-4 animate-spin text-muted-foreground" aria-hidden />
        ) : null}
      </div>
      {error ? (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  )
}
