import type { Route } from "next"

import { ROUTES } from "@/config/routes"
import {
  WEB_VITALS_DEVICE_FILTER,
  WEB_VITALS_RANGE,
  WEB_VITALS_SEARCH_PARAM,
  type WebVitalsFilter,
} from "@/lib/constants/web-vitals"
import {
  buildAdminPostListQuery,
  type AdminPostListParams,
} from "@/lib/validations/admin-post-list"

// 依賴 zod 驗證模組的後台路由獨立成檔，避免 config/routes 被前台引入時把 zod 帶進所有頁面

// 後台文章列表的搜尋、狀態篩選與分頁都以查詢參數表示，可分享也支援上一頁
export function adminPostListRoute(params: AdminPostListParams): Route {
  const query = buildAdminPostListQuery(params)
  return (query ? `${ROUTES.ADMIN_POSTS}?${query}` : ROUTES.ADMIN_POSTS) as Route
}

// 儀表板效能監控的時間範圍與裝置篩選；預設值不寫進網址，保持網址簡潔
export function adminDashboardVitalsRoute({ range, device }: WebVitalsFilter): Route {
  const query = new URLSearchParams()
  if (range !== WEB_VITALS_RANGE.MONTH) query.set(WEB_VITALS_SEARCH_PARAM.RANGE, range)
  if (device !== WEB_VITALS_DEVICE_FILTER.ALL) query.set(WEB_VITALS_SEARCH_PARAM.DEVICE, device)

  const search = query.toString()
  return (search ? `${ROUTES.ADMIN_DASHBOARD}?${search}` : ROUTES.ADMIN_DASHBOARD) as Route
}
