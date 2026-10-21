"use client"

import { useCallback, useState } from "react"

import { API_ROUTES } from "@/config/routes"
import type { StorageFolder } from "@/lib/storage/constants"
import type { UploadResponse } from "@/lib/storage/types"
import { validateImageFile } from "@/lib/storage/validation"

const UPLOAD_FAILED_MESSAGE = "圖片上傳失敗，請檢查網路連線後再試"

// 瀏覽器端先以與伺服器相同的規則預檢（格式、大小、檔頭），省下無效上傳；伺服器仍會再驗證一次
export function useImageUpload(folder: StorageFolder) {
  const [pendingCount, setPendingCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // 只依賴 folder 與 state setter，以 useCallback 保持參考穩定，可安全傳入只建立一次的編輯器擴充
  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      setError(null)

      const validation = await validateImageFile(file)

      if (!validation.ok) {
        setError(`「${file.name}」${validation.message}`)
        return null
      }

      setPendingCount((count) => count + 1)

      try {
        const body = new FormData()
        body.set("file", file)
        body.set("folder", folder)

        const response = await fetch(API_ROUTES.STORAGE_UPLOAD, { method: "POST", body })
        const result = (await response.json()) as UploadResponse

        if ("error" in result) {
          setError(result.error)
          return null
        }

        return result.url
      } catch {
        setError(UPLOAD_FAILED_MESSAGE)
        return null
      } finally {
        setPendingCount((count) => count - 1)
      }
    },
    [folder],
  )

  const clearError = useCallback(() => setError(null), [])

  return { upload, error, clearError, isUploading: pendingCount > 0 }
}
