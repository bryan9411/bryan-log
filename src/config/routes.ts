import type { Route } from "next"

export const ROUTES = {
  HOME: "/",
  POSTS: "/posts",
  ADMIN: "/admin",
  ADMIN_LOGIN: "/admin/login",
  ADMIN_DASHBOARD: "/admin/dashboard",
  ADMIN_POSTS: "/admin/posts",
  ADMIN_POST_NEW: "/admin/posts/new",
  ADMIN_PROJECTS: "/admin/projects",
  ADMIN_STORAGE: "/admin/storage",
} as const

export const API_ROUTES = {
  STORAGE_UPLOAD: "/api/storage/upload",
} as const

export const REDIRECT_PARAM = "next"

export const POST_CREATED_PARAM = "created"

export function adminEditPostRoute(id: string): Route {
  return `/admin/posts/${id}/edit` as Route
}

// 前台文章頁將於階段五建立，此處僅供重新驗證快取使用，因此回傳一般字串
export function postDetailPath(slug: string) {
  return `${ROUTES.POSTS}/${slug}`
}
