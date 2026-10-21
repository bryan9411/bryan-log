import type { Route } from "next"

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
  ADMIN_STORAGE: "/admin/storage",
} as const

export const API_ROOT = "/api"

export const API_ROUTES = {
  STORAGE_UPLOAD: `${API_ROOT}/storage/upload`,
} as const

export const REDIRECT_PARAM = "next"

export const POST_CREATED_PARAM = "created"

export function adminEditPostRoute(id: string): Route {
  return `/admin/posts/${id}/edit` as Route
}

// 前台文章與作品詳細頁將於階段五建立，typedRoutes 尚無法推導動態路徑，因此明確轉型為 Route
export function postDetailPath(slug: string): Route {
  return `${ROUTES.POSTS}/${slug}` as Route
}

export function projectDetailPath(slug: string): Route {
  return `${ROUTES.PROJECTS}/${slug}` as Route
}
