import "server-only"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { connection } from "next/server"

import { getPublicEnv } from "@/lib/env"
import type { Database } from "@/types/database"

// 伺服器端 Client：每次請求建立新實例，避免不同使用者的工作階段互相污染
// Next.js 16：包含使用者 cookie 與身分判斷，需宣告 await connection() 避免靜態預先渲染時存取 Date.now() 報錯
export async function createClient() {
  await connection()
  const cookieStore = await cookies()
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getPublicEnv()

  return createServerClient<Database>(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server Component 無法寫入 cookie，工作階段的刷新交由 proxy 處理
        }
      },
    },
  })
}
