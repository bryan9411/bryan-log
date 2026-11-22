import { z } from "zod"

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url("NEXT_PUBLIC_SUPABASE_URL 必須是有效的網址"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "缺少 NEXT_PUBLIC_SUPABASE_ANON_KEY"),
})

export type PublicEnv = z.infer<typeof publicEnvSchema>

let cachedEnv: PublicEnv | null = null

// NEXT_PUBLIC_ 變數必須以完整名稱靜態存取，Next.js 才能在建置時內嵌到瀏覽器端
export function getPublicEnv(): PublicEnv {
  if (cachedEnv) return cachedEnv

  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })

  if (!result.success) {
    const issues = result.error.issues.map((issue) => `- ${issue.message}`).join("\n")
    throw new Error(`環境變數設定錯誤，請參考 .env.example：\n${issues}`)
  }

  cachedEnv = result.data
  return cachedEnv
}

// 只在伺服器端使用的機密：排程寫入資料庫、驗證 Vercel Cron、呼叫 GitHub 與 NVD API
// 讀取這些值的模組都必須 import "server-only"，避免被打包進瀏覽器端
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "缺少 SUPABASE_SERVICE_ROLE_KEY"),
  CRON_SECRET: z.string().min(16, "CRON_SECRET 至少需要 16 個字元"),
  GITHUB_TOKEN: z.string().min(1, "缺少 GITHUB_TOKEN"),
  // 選用：提高 NVD API 速率上限（查 CVSS 分數）；空字串視為未設定
  NVD_API_KEY: z.preprocess((value) => value || undefined, z.string().optional()),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

let cachedServerEnv: ServerEnv | null = null

export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv

  const result = serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    NVD_API_KEY: process.env.NVD_API_KEY,
  })

  if (!result.success) {
    const issues = result.error.issues.map((issue) => `- ${issue.message}`).join("\n")
    throw new Error(`伺服器端環境變數設定錯誤，請參考 .env.example：\n${issues}`)
  }

  cachedServerEnv = result.data
  return cachedServerEnv
}
