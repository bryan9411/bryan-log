import "server-only"

import { revalidatePath } from "next/cache"

import { ROUTES } from "@/config/routes"

// 同步或後台異動後一併重新驗證的頁面；資料快取另以 CACHE_TAG.RADAR 失效（Route Handler 與 Server Action 的 API 不同，由呼叫端處理）
export function revalidateRadarPaths() {
  revalidatePath(ROUTES.RADAR)
  revalidatePath(ROUTES.RADAR_GITHUB)
  revalidatePath(ROUTES.RADAR_HN)
  revalidatePath(ROUTES.RADAR_SECURITY)
  revalidatePath(ROUTES.ADMIN_RADAR)
  revalidatePath(ROUTES.ADMIN_RADAR_GITHUB)
  revalidatePath(ROUTES.ADMIN_RADAR_HN)
  revalidatePath(ROUTES.ADMIN_RADAR_SECURITY)
}
