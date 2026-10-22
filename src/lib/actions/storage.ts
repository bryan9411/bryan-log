"use server"

import { revalidatePath } from "next/cache"

import { ROUTES } from "@/config/routes"
import { createErrorState, createSuccessState, type ActionState } from "@/lib/actions/action-state"
import { requireAdmin } from "@/lib/auth/session"
import { formatBytes } from "@/lib/format"
import { cleanupUnreferencedFiles } from "@/lib/storage/unreferenced-cleaner"

export type CleanupField = "confirm"

export type CleanupState = ActionState<CleanupField>

const CONFIRM_VALUE = "on"

export async function cleanupUnreferencedAction(
  _prevState: CleanupState,
  formData: FormData,
): Promise<CleanupState> {
  await requireAdmin()

  if (formData.get("confirm") !== CONFIRM_VALUE) {
    return createErrorState("請先勾選確認，了解刪除後無法復原", {
      fieldErrors: { confirm: ["請勾選此項目以繼續"] },
    })
  }

  try {
    const { deletedCount, freedBytes, failedPaths } = await cleanupUnreferencedFiles()

    revalidatePath(ROUTES.ADMIN_STORAGE)

    if (deletedCount === 0 && failedPaths.length === 0) {
      return createSuccessState("目前沒有可清理的未引用檔案")
    }

    const summary = `已清除 ${deletedCount} 個檔案，釋放 ${formatBytes(freedBytes)}`

    if (failedPaths.length > 0) {
      return createErrorState(`${summary}；另有 ${failedPaths.length} 個檔案刪除失敗，請稍後重試`)
    }

    return createSuccessState(summary)
  } catch (error) {
    const reason = error instanceof Error ? error.message : "未知錯誤"
    return createErrorState(`清理失敗，未刪除任何檔案（${reason}）`)
  }
}
