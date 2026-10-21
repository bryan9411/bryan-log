import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

// 前台所有區塊共用同一個內容寬度與左右留白
export function SiteContainer({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-5xl px-5 sm:px-6", className)} {...props} />
}
