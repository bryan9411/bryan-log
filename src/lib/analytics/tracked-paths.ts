import { PREVIEW_ROOT, ROUTES } from "@/config/routes"

// 只統計真實訪客：後台與草稿預覽頁由作者本人瀏覽，數據會干擾前台的 LCP、INP、CLS 判讀
const EXCLUDED_PATH_PREFIXES = [ROUTES.ADMIN, PREVIEW_ROOT]

export function isTrackedPath(pathname: string) {
  return !EXCLUDED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}
