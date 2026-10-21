"use client"

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react"

import {
  removeLocalStorage,
  useLocalStorageValue,
  writeLocalStorage,
} from "@/hooks/use-local-storage-value"

export const AUTOSAVE_INTERVAL_MS = 30_000

export type AutosaveBackup<T> = {
  savedAt: number
  data: T
}

function parseBackup<T>(raw: string | null): AutosaveBackup<T> | null {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<AutosaveBackup<T>>
    if (typeof parsed.savedAt !== "number" || parsed.data === undefined) return null
    return { savedAt: parsed.savedAt, data: parsed.data }
  } catch {
    return null
  }
}

export function useAutosaveBackup<T>(storageKey: string) {
  const raw = useLocalStorageValue(storageKey)
  return useMemo(() => parseBackup<T>(raw), [raw])
}

type UseAutosaveOptions<T> = {
  storageKey: string
  data: T
  // 尚未決定是否還原舊暫存時應暫停，避免新內容覆蓋掉使用者還沒看過的備份
  enabled?: boolean
  intervalMs?: number
  onSaved?: (savedAt: number) => void
}

// 每隔固定時間把表單快照寫入 localStorage；內容未變動時略過，避免無意義的寫入
export function useAutosave<T>({
  storageKey,
  data,
  enabled = true,
  intervalMs = AUTOSAVE_INTERVAL_MS,
  onSaved,
}: UseAutosaveOptions<T>) {
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const [hasStorageError, setHasStorageError] = useState(false)
  const lastSerializedRef = useRef<string | null>(null)

  const saveSnapshot = useEffectEvent(() => {
    const serialized = JSON.stringify(data)
    if (serialized === lastSerializedRef.current) return

    const savedAt = Date.now()
    const isSaved = writeLocalStorage(storageKey, JSON.stringify({ savedAt, data }))

    setHasStorageError(!isSaved)
    if (!isSaved) return

    lastSerializedRef.current = serialized
    setLastSavedAt(savedAt)
    onSaved?.(savedAt)
  })

  useEffect(() => {
    if (!enabled) return
    const timer = window.setInterval(saveSnapshot, intervalMs)
    return () => window.clearInterval(timer)
  }, [enabled, intervalMs])

  // 將指定內容標記為「已同步」：正式存檔成功或還原暫存後呼叫，下一輪不會重複寫入相同內容
  const markSynced = (synced: T) => {
    lastSerializedRef.current = JSON.stringify(synced)
  }

  const clear = () => {
    removeLocalStorage(storageKey)
    setLastSavedAt(null)
  }

  return { lastSavedAt, hasStorageError, markSynced, clear }
}
