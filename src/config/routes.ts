import type { Route } from "next"

import { CATEGORY_SEARCH_PARAM } from "@/lib/content/category-filter"
import {
  buildAdminPostListQuery,
  type AdminPostListParams,
} from "@/lib/validations/admin-post-list"

export const ROUTES = {
  HOME: "/",
  POSTS: "/posts",
  PROJECTS: "/projects",
  ADMIN: "/admin",
  ADMIN_LOGIN: "/admin/login",
  ADMIN_DASHBOARD: "/admin/dashboard",
  ADMIN_POSTS: "/admin/posts",
  ADMIN_POST_NEW: "/admin/posts/new",
  ADMIN_PROJECTS: "/admin/projects",
  ADMIN_PROJECT_NEW: "/admin/projects/new",
  ADMIN_CATEGORIES: "/admin/categories",
  ADMIN_STORAGE: "/admin/storage",
} as const

export const API_ROOT = "/api"

export const API_ROUTES = {
  STORAGE_UPLOAD: `${API_ROOT}/storage/upload`,
  SEARCH_INDEX: `${API_ROOT}/search`,
} as const

export const REDIRECT_PARAM = "next"

export const POST_CREATED_PARAM = "created"

// 後台文章列表的搜尋、狀態篩選與分頁都以查詢參數表示，可分享也支援上一頁
export function adminPostListRoute(params: AdminPostListParams): Route {
  const query = buildAdminPostListQuery(params)
  return (query ? `${ROUTES.ADMIN_POSTS}?${query}` : ROUTES.ADMIN_POSTS) as Route
}

export function adminEditPostRoute(id: string): Route {
  return `/admin/posts/${id}/edit` as Route
}

export function adminEditProjectRoute(id: string): Route {
  return `/admin/projects/${id}/edit` as Route
}

// typedRoutes 無法由字串組合推導出動態路徑，因此明確轉型為 Route
export function postDetailPath(slug: string): Route {
  return `${ROUTES.POSTS}/${slug}` as Route
}

export function projectDetailPath(slug: string): Route {
  return `${ROUTES.PROJECTS}/${slug}` as Route
}

// 列表頁的分類篩選連結，查詢參數名稱與篩選元件共用
export function categoryFilterRoute(
  listPath: typeof ROUTES.POSTS | typeof ROUTES.PROJECTS,
  slug: string,
): Route {
  return `${listPath}?${new URLSearchParams({ [CATEGORY_SEARCH_PARAM]: slug })}` as Route
}
