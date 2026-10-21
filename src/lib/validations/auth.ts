import { z } from "zod"

// 與 Supabase Auth 預設的最短密碼長度一致
export const PASSWORD_MIN_LENGTH = 6
export const PASSWORD_MAX_LENGTH = 72

export const loginSchema = z.object({
  email: z
    .string({ error: "請輸入電子郵件" })
    .trim()
    .min(1, "請輸入電子郵件")
    .pipe(z.email("電子郵件格式不正確")),
  password: z
    .string({ error: "請輸入密碼" })
    .min(1, "請輸入密碼")
    .min(PASSWORD_MIN_LENGTH, `密碼至少需要 ${PASSWORD_MIN_LENGTH} 個字元`)
    .max(PASSWORD_MAX_LENGTH, `密碼不可超過 ${PASSWORD_MAX_LENGTH} 個字元`),
})

export type LoginInput = z.infer<typeof loginSchema>

export type LoginField = keyof LoginInput
