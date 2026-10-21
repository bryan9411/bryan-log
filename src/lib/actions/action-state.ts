import type { z } from "zod"

export const ACTION_STATUS = {
  IDLE: "idle",
  SUCCESS: "success",
  ERROR: "error",
} as const

export type ActionStatus = (typeof ACTION_STATUS)[keyof typeof ACTION_STATUS]

// useActionState 共用的回傳結構，fieldErrors 對應各欄位的驗證訊息，values 用於失敗時回填表單
export type ActionState<TField extends string = never> = {
  status: ActionStatus
  message: string | null
  fieldErrors?: Partial<Record<TField, string[]>>
  values?: Partial<Record<TField, string>>
}

export const initialActionState: ActionState = {
  status: ACTION_STATUS.IDLE,
  message: null,
}

export function createErrorState<TField extends string>(
  message: string,
  extra: Omit<ActionState<TField>, "status" | "message"> = {},
): ActionState<TField> {
  return { status: ACTION_STATUS.ERROR, message, ...extra }
}

export function createSuccessState<TField extends string = never>(
  message: string,
): ActionState<TField> {
  return { status: ACTION_STATUS.SUCCESS, message }
}

export function toFieldErrors<TField extends string>(error: z.ZodError) {
  const fieldErrors: Partial<Record<TField, string[]>> = {}

  error.issues.forEach((issue) => {
    const field = issue.path[0] as TField | undefined
    if (!field) return
    fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message]
  })

  return fieldErrors
}
