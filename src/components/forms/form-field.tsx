import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type FieldShellProps = {
  id: string
  label: string
  errors?: string[]
  hint?: React.ReactNode
  children: (describedBy: string | undefined, hasError: boolean) => React.ReactNode
}

export const getFieldErrorId = (id: string) => `${id}-error`

// 統一處理標籤、說明文字、錯誤訊息與 aria 關聯，Input／Textarea／Select 等欄位共用
export function FieldShell({ id, label, errors, hint, children }: FieldShellProps) {
  const errorId = getFieldErrorId(id)
  const hintId = `${id}-hint`
  const hasError = Boolean(errors?.length)
  const describedBy = [hasError ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ")

  const maybeRenderHint = () => {
    if (!hint) return null
    return (
      <p id={hintId} className="text-xs text-muted-foreground">
        {hint}
      </p>
    )
  }

  const maybeRenderErrors = () => {
    if (!hasError) return null
    return (
      <p id={errorId} className="text-sm text-destructive">
        {errors?.[0]}
      </p>
    )
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children(describedBy || undefined, hasError)}
      {maybeRenderHint()}
      {maybeRenderErrors()}
    </div>
  )
}

type FormFieldProps = React.ComponentProps<typeof Input> & {
  name: string
  label: string
  errors?: string[]
  hint?: React.ReactNode
}

export function FormField({ name, label, errors, hint, id = name, ...inputProps }: FormFieldProps) {
  return (
    <FieldShell id={id} label={label} errors={errors} hint={hint}>
      {(describedBy, hasError) => (
        <Input
          id={id}
          name={name}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          {...inputProps}
        />
      )}
    </FieldShell>
  )
}
