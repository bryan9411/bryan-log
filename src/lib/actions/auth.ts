"use server"

import { redirect } from "next/navigation"

import { REDIRECT_PARAM, ROUTES } from "@/config/routes"
import { createErrorState, toFieldErrors, type ActionState } from "@/lib/actions/action-state"
import { getSafeRedirectPath } from "@/lib/auth/redirect"
import { createClient } from "@/lib/supabase/server"
import { loginSchema, type LoginField } from "@/lib/validations/auth"

const AUTH_ERROR_CODE = {
  INVALID_CREDENTIALS: "invalid_credentials",
  RATE_LIMITED: "over_request_rate_limit",
  EMAIL_NOT_CONFIRMED: "email_not_confirmed",
} as const

// 不區分「帳號不存在」與「密碼錯誤」，避免帳號列舉攻擊
const AUTH_ERROR_MESSAGE: Record<string, string> = {
  [AUTH_ERROR_CODE.INVALID_CREDENTIALS]: "電子郵件或密碼錯誤",
  [AUTH_ERROR_CODE.RATE_LIMITED]: "嘗試次數過多，請稍後再試",
  [AUTH_ERROR_CODE.EMAIL_NOT_CONFIRMED]: "此帳號尚未完成信箱驗證",
}

const FALLBACK_ERROR_MESSAGE = "登入服務暫時無法使用，請稍後再試"

export type LoginState = ActionState<LoginField>

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const rawEmail = formData.get("email")
  const values = { email: typeof rawEmail === "string" ? rawEmail : "" }

  const parsed = loginSchema.safeParse({
    email: rawEmail,
    password: formData.get("password"),
  })

  if (!parsed.success) {
    return createErrorState("請修正標示的欄位後再送出", {
      fieldErrors: toFieldErrors<LoginField>(parsed.error),
      values,
    })
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword(parsed.data)

    if (error) {
      const message = (error.code && AUTH_ERROR_MESSAGE[error.code]) || FALLBACK_ERROR_MESSAGE
      return createErrorState(message, { values })
    }
  } catch {
    return createErrorState(FALLBACK_ERROR_MESSAGE, { values })
  }

  // redirect 會拋出控制流程例外，必須放在 try/catch 之外
  redirect(getSafeRedirectPath(formData.get(REDIRECT_PARAM)))
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  redirect(ROUTES.ADMIN_LOGIN)
}
