"use client"

import { useActionState } from "react"

import { FormField } from "@/components/forms/form-field"
import { FormMessage } from "@/components/forms/form-message"
import { SubmitButton } from "@/components/forms/submit-button"
import { REDIRECT_PARAM } from "@/config/routes"
import { initialActionState } from "@/lib/actions/action-state"
import { loginAction, type LoginState } from "@/lib/actions/auth"
import { PASSWORD_MAX_LENGTH } from "@/lib/validations/auth"

type LoginFormProps = {
  redirectTo: string
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, initialActionState)

  const fieldErrors = state.fieldErrors ?? {}

  // noValidate 讓錯誤訊息統一由 Zod 以繁體中文回傳，避免瀏覽器原生英文提示
  return (
    <form action={formAction} noValidate className="grid gap-5">
      <input type="hidden" name={REDIRECT_PARAM} value={redirectTo} />

      <FormMessage state={state} />

      <FormField
        name="email"
        type="email"
        label="電子郵件"
        placeholder="admin@example.com"
        autoComplete="username"
        inputMode="email"
        defaultValue={state.values?.email}
        errors={fieldErrors.email}
        autoFocus
      />

      <FormField
        name="password"
        type="password"
        label="密碼"
        placeholder="請輸入密碼"
        autoComplete="current-password"
        maxLength={PASSWORD_MAX_LENGTH}
        errors={fieldErrors.password}
      />

      <SubmitButton pendingText="登入中…" size="lg" className="w-full">
        登入
      </SubmitButton>
    </form>
  )
}
