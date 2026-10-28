import type { Route } from "next"

import { CATEGORY_SEARCH_PARAM } from "@/lib/content/category-filter"
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

export const ROUTES = {
  HOME: "/",
  PROJECTS: "/projects",
  ARCHIVES: "/archives",
  ADMIN: "/admin",
  ADMIN_LOGIN: "/admin/login",
  ADMIN_DASHBOARD: "/admin/dashboard",
  ADMIN_POSTS: "/admin/posts",
  ADMIN_POST_NEW: "/admin/posts/new",
  ADMIN_PROJECTS: "/admin/projects",
  ADMIN_PROJECT_NEW: "/admin/projects/new",
  ADMIN_POST_CATEGORIES: "/admin/post-categories",
  ADMIN_PROJECT_CATEGORIES: "/admin/project-categories",
  ADMIN_STORAGE: "/admin/storage",
  ADMIN_TOOLS: "/admin/tools",
  // AI 爬蟲專用的 Markdown 索引與全文（llmstxt.org 協定）
  LLMS_TXT: "/llms.txt",
  LLMS_FULL_TXT: "/llms-full.txt",
} as const

// 動態路由樣式，供 revalidatePath(pattern, "page") 一次失效所有區塊列表頁與文章內頁
export const ROUTE_PATTERN = {
  SECTION: "/[section]",
  POST_DETAIL: "/[section]/[slug]",
} as const

export const API_ROOT = "/api"

export const API_ROUTES = {
  STORAGE_UPLOAD: `${API_ROOT}/storage/upload`,
  SEARCH_INDEX: `${API_ROOT}/search`,
  PREVIEW_ENABLE: `${API_ROOT}/preview`,
  PREVIEW_DISABLE: `${API_ROOT}/preview/disable`,
  POSTS_EXPORT: `${API_ROOT}/admin/export/posts`,
  WEB_VITALS: `${API_ROOT}/vitals`,
} as const

export const REDIRECT_PARAM = "next"

export const POST_CREATED_PARAM = "created"

// 草稿預覽頁位於前台版型下，以訪客視角呈現；路徑以文章 id 識別，草稿的網址代稱可能尚未定案
export const PREVIEW_ROOT = "/preview"

export const PREVIEW_POST_ID_PARAM = "id"

export function previewPostPath(id: string): Route {
  return `${PREVIEW_ROOT}/posts/${id}` as Route
}

// 由後台編輯頁開啟：先經由 API 啟用 Draft Mode，再轉往預覽頁
export function enablePreviewRoute(id: string) {
  return `${API_ROUTES.PREVIEW_ENABLE}?${new URLSearchParams({ [PREVIEW_POST_ID_PARAM]: id })}`
}

export function disablePreviewRoute(id: string) {
  return `${API_ROUTES.PREVIEW_DISABLE}?${new URLSearchParams({ [PREVIEW_POST_ID_PARAM]: id })}`
}

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

export function adminEditPostRoute(id: string): Route {
  return `/admin/posts/${id}/edit` as Route
}

export function adminEditProjectRoute(id: string): Route {
  return `/admin/projects/${id}/edit` as Route
}

// typedRoutes 無法由字串組合推導出動態路徑，因此明確轉型為 Route
// 每個內容區塊的列表頁位於網站根目錄，例如 /posts、/travel
export function sectionPath(sectionSlug: string): Route {
  return `/${sectionSlug}` as Route
}

export function postDetailPath(sectionSlug: string, slug: string): Route {
  return `/${sectionSlug}/${slug}` as Route
}

export function projectDetailPath(slug: string): Route {
  return `${ROUTES.PROJECTS}/${slug}` as Route
}

// 列表頁的分類篩選連結，查詢參數名稱與篩選元件共用
export function categoryFilterRoute(listPath: string, slug: string): Route {
  return `${listPath}?${new URLSearchParams({ [CATEGORY_SEARCH_PARAM]: slug })}` as Route
}
