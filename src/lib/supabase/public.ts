import "server-only"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"

import { getPublicEnv } from "@/lib/env"
import type { Database } from "@/types/database"

// 前台公開資料專用：不讀取 cookie、一律以匿名身分查詢，因此可放進 "use cache" 跨請求共用
// 匿名身分只看得到 RLS 允許的已發布內容，即使誤用也不會洩漏草稿
export function createPublicClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getPublicEnv()

  return createSupabaseClient<Database>(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
