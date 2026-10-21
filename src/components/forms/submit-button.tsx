"use client"

import { Loader2Icon } from "lucide-react"
import { useFormStatus } from "react-dom"

import { Button } from "@/components/ui/button"

type SubmitButtonProps = Omit<React.ComponentProps<typeof Button>, "type"> & {
  pendingText: string
}

// 透過 useFormStatus 讀取所屬 <form> 的送出狀態，送出期間自動停用以防重複提交
export function SubmitButton({ children, pendingText, disabled, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus()

  const maybeRenderSpinner = () => {
    if (!pending) return null
    return <Loader2Icon className="animate-spin" aria-hidden />
  }

  return (
    <Button type="submit" disabled={pending || disabled} aria-disabled={pending} {...props}>
      {maybeRenderSpinner()}
      {pending ? pendingText : children}
    </Button>
  )
}
