import "server-only"

import { redirect } from "next/navigation"
import { connection } from "next/server"
import { cache } from "react"

import { ROUTES } from "@/config/routes"
import { createClient } from "@/lib/supabase/server"

export type AdminUser = {
  id: string
  email: string | null
}

// 以 React cache 在同一次請求內去重，layout 與多個元件同時呼叫也只驗證一次
// Next.js 16：身分檢查屬於每次請求動態行為，await connection() 避免靜態預先渲染時觸發 Supabase Date.now() 警告
export const getAdminUser = cache(async (): Promise<AdminUser | null> => {
  await connection()
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()

  if (error || !data) return null

  return { id: data.claims.sub, email: data.claims.email ?? null }
})

// 縱深防禦：proxy 之外，所有後台頁面與 Server Action 都必須再次驗證身分
export async function requireAdmin(): Promise<AdminUser> {
  const user = await getAdminUser()

  if (!user) redirect(ROUTES.ADMIN_LOGIN)

  return user
}
