import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type FormFieldProps = React.ComponentProps<typeof Input> & {
  name: string
  label: string
  errors?: string[]
}

export function FormField({ name, label, errors, id = name, ...inputProps }: FormFieldProps) {
  const errorId = `${id}-error`
  const hasError = Boolean(errors?.length)

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
      <Input
        id={id}
        name={name}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        {...inputProps}
      />
      {maybeRenderErrors()}
    </div>
  )
}
