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
