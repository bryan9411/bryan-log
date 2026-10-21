import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { getPublicEnv } from "@/lib/env"
import type { Database } from "@/types/database"

type SessionResult = {
  response: NextResponse
  userId: string | null
}

// 於 proxy 中刷新 Supabase 工作階段，並以 getClaims 驗證 JWT 簽章（不可信任 getSession 的未驗證資料）
export async function updateSession(request: NextRequest): Promise<SessionResult> {
  let response = NextResponse.next({ request })
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getPublicEnv()

  const supabase = createServerClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value))
        },
      },
    },
  )

  try {
    const { data } = await supabase.auth.getClaims()
    return { response, userId: data?.claims.sub ?? null }
  } catch {
    // 驗證服務無法連線時一律視為未登入，採取失敗即拒絕（fail closed）
    return { response, userId: null }
  }
}

// 重導向時必須帶上刷新後的 cookie，否則使用者會被意外登出
export function redirectWithSession(url: URL, sessionResponse: NextResponse) {
  const redirectResponse = NextResponse.redirect(url)

  sessionResponse.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie))

  return redirectResponse
}
