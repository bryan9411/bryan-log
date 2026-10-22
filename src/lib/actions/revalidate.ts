"use server"

import { revalidatePath, updateTag } from "next/cache"

import {
  createErrorState,
  createSuccessState,
  toFieldErrors,
  type ActionState,
} from "@/lib/actions/action-state"
import { requireAdmin } from "@/lib/auth/session"
import type { CacheTag } from "@/lib/cache-tags"
import {
  CACHE_TAG_LABEL,
  cacheTagSchema,
  REVALIDATE_TYPE,
  revalidatePathSchema,
  type RevalidateField,
} from "@/lib/validations/revalidate"

export type RevalidateState = ActionState<RevalidateField> & {
  // 每次成功都更新，供客戶端把結果加入操作紀錄
  revalidatedAt?: number
}

// 手動清除路徑快取：下一次請求該路徑時會重新產生頁面，CDN 上的舊版本同時失效
export async function revalidatePathAction(
  _prevState: RevalidateState,
  formData: FormData,
): Promise<RevalidateState> {
  await requireAdmin()

  const parsed = revalidatePathSchema.safeParse({
    path: formData.get("path"),
    type: formData.get("type"),
  })

  if (!parsed.success) {
    return createErrorState("請修正標示的欄位後再送出", {
      fieldErrors: toFieldErrors<RevalidateField>(parsed.error),
    })
  }

  const { path, type } = parsed.data

  if (type === REVALIDATE_TYPE.AUTO) revalidatePath(path)
  else revalidatePath(path, type)

  return {
    ...createSuccessState<RevalidateField>(`已重新驗證 ${path}，下一次造訪時會重新產生頁面`),
    revalidatedAt: Date.now(),
  }
}

// 依資料快取標籤立即失效：適用於直接修改資料庫後，讓所有引用該資料的頁面同步更新
export async function revalidateTagAction(tag: CacheTag): Promise<RevalidateState> {
  await requireAdmin()

  const parsed = cacheTagSchema.safeParse(tag)
  if (!parsed.success) return createErrorState(parsed.error.issues[0].message)

  updateTag(parsed.data)

  return {
    ...createSuccessState<RevalidateField>(
      `已清除「${CACHE_TAG_LABEL[parsed.data]}」快取，相關頁面下一次造訪時會重新查詢`,
    ),
    revalidatedAt: Date.now(),
  }
}
