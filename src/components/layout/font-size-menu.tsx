"use client"

import { DropdownMenu } from "radix-ui"
import { CheckIcon } from "lucide-react"

import { FontSizeToggleButton } from "@/components/layout/font-size-toggle-button"
import { useFontSize } from "@/hooks/use-font-size"
import { FONT_SIZE_OPTIONS } from "@/lib/constants/font-size"
import { cn } from "@/lib/utils"

// 各段落的預覽字級，讓選項本身就能看出大小差異
const OPTION_PREVIEW_CLASS = ["text-sm", "text-base", "text-lg"] as const

type FontSizeMenuProps = {
  contentClassName?: string
  triggerClassName?: string
}

// 第一次點擊字級按鈕時才載入，載入後直接以開啟狀態出現；選項只在開啟後於客戶端渲染，此時已能讀到實際設定
export function FontSizeMenu({ contentClassName, triggerClassName }: FontSizeMenuProps) {
  const { fontSize, setFontSize } = useFontSize()

  const renderOption = ({ value, label }: (typeof FONT_SIZE_OPTIONS)[number], index: number) => (
    <DropdownMenu.RadioItem
      key={value}
      value={value}
      className="relative flex cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm outline-none select-none data-highlighted:bg-muted data-[state=checked]:font-medium"
    >
      <span className={cn("w-5 text-center leading-none", OPTION_PREVIEW_CLASS[index])} aria-hidden>
        字
      </span>
      {label}
      <DropdownMenu.ItemIndicator className="absolute right-2 flex items-center">
        <CheckIcon className="size-4" aria-hidden />
      </DropdownMenu.ItemIndicator>
    </DropdownMenu.RadioItem>
  )

  return (
    <DropdownMenu.Root modal={false} defaultOpen>
      <DropdownMenu.Trigger asChild>
        <FontSizeToggleButton className={triggerClassName} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className={cn(
            "z-50 min-w-36 rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            contentClassName,
          )}
        >
          <DropdownMenu.Label className="px-2 pt-1 pb-1.5 text-xs text-muted-foreground">
            文字大小
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={fontSize} onValueChange={setFontSize}>
            {FONT_SIZE_OPTIONS.map(renderOption)}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
