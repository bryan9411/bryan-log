"use client"

import { Checkbox as CheckboxPrimitive } from "radix-ui"
import { CheckIcon, MinusIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// checked 可為 "indeterminate"，用於表頭「部分選取」的狀態
function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input transition-colors outline-none",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        // 未選取狀態：淺色白底，深色半透明深灰底
        "data-[state=unchecked]:bg-background data-[state=unchecked]:dark:border-input data-[state=unchecked]:dark:bg-input/30",
        // 選取與部分選取狀態：
        // 淺色模式：深黑底白勾
        // 深色模式：純白底黑勾（極致高對比，杜絕黑底黑勾）
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        "data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground",
        "dark:data-[state=checked]:border-foreground dark:data-[state=checked]:bg-foreground dark:data-[state=checked]:text-background",
        "dark:data-[state=indeterminate]:border-foreground dark:data-[state=indeterminate]:bg-foreground dark:data-[state=indeterminate]:text-background",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="group flex items-center justify-center text-current">
        <CheckIcon
          className="size-3.5 stroke-[2.5] group-data-[state=indeterminate]:hidden"
          aria-hidden
        />
        <MinusIcon
          className="hidden size-3.5 stroke-[2.5] group-data-[state=indeterminate]:block"
          aria-hidden
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
