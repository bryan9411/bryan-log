import { CircleAlertIcon, CircleCheckIcon } from "lucide-react"

import { ACTION_STATUS, type ActionState } from "@/lib/actions/action-state"
import { cn } from "@/lib/utils"

type FormMessageProps = {
  state: Pick<ActionState, "status" | "message">
  className?: string
}

export function FormMessage({ state, className }: FormMessageProps) {
  if (!state.message || state.status === ACTION_STATUS.IDLE) return null

  const isError = state.status === ACTION_STATUS.ERROR
  const Icon = isError ? CircleAlertIcon : CircleCheckIcon

  return (
    <div
      role={isError ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
        isError
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-border bg-muted text-foreground",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{state.message}</span>
    </div>
  )
}
