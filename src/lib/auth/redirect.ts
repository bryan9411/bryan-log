import type { Route } from "next"

import { ROUTES } from "@/config/routes"

// 防範開放式重導向：只接受站內 /admin 底下的相對路徑，且不可導回登入頁本身
export function getSafeRedirectPath(candidate: unknown): Route {
  if (typeof candidate !== "string") return ROUTES.ADMIN_DASHBOARD

  const isAdminPath = candidate === ROUTES.ADMIN || candidate.startsWith(`${ROUTES.ADMIN}/`)
  const isProtocolRelative = candidate.startsWith("//") || candidate.includes("\\")
  const isLoginPath = candidate.startsWith(ROUTES.ADMIN_LOGIN)

  if (!isAdminPath || isProtocolRelative || isLoginPath) return ROUTES.ADMIN_DASHBOARD

  // 已通過白名單檢查，可安全視為站內路由
  return candidate as Route
}
