import "server-only"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"

import { getPublicEnv, getServerEnv } from "@/lib/env"
import type { Database } from "@/types/database"

// service role 會略過 RLS：只給排程與後台同步使用，呼叫端必須先驗證 CRON_SECRET 或 requireAdmin()
export function createServiceClient() {
  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv()
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv()

  return createSupabaseClient<Database>(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

export type ServiceClient = ReturnType<typeof createServiceClient>
