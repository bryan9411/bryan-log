import type { NextRequest } from "next/server"

import { REDIRECT_PARAM, ROUTES } from "@/config/routes"
import { getSafeRedirectPath } from "@/lib/auth/redirect"
import { redirectWithSession, updateSession } from "@/lib/supabase/proxy"

const NO_INDEX_HEADER = "X-Robots-Tag"
const NO_INDEX_VALUE = "noindex, nofollow"

// Next.js 16 起 middleware 更名為 proxy（功能相同，執行於 Node.js runtime）
// 這是第一道防線：後台頁面與 Server Action 仍會各自以 requireAdmin() 再次驗證
export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request)
  const { pathname, search } = request.nextUrl
  const isLoginPage = pathname === ROUTES.ADMIN_LOGIN

  if (!userId && !isLoginPage) {
    const loginUrl = new URL(ROUTES.ADMIN_LOGIN, request.url)
    loginUrl.searchParams.set(REDIRECT_PARAM, getSafeRedirectPath(`${pathname}${search}`))
    return redirectWithSession(loginUrl, response)
  }

  if (userId && isLoginPage) {
    const target = getSafeRedirectPath(request.nextUrl.searchParams.get(REDIRECT_PARAM))
    return redirectWithSession(new URL(target, request.url), response)
  }

  response.headers.set(NO_INDEX_HEADER, NO_INDEX_VALUE)
  return response
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
}
