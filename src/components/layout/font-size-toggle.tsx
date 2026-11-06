"use client"

import { useId } from "react"
import { DropdownMenu, ToggleGroup } from "radix-ui"
import { ALargeSmallIcon, CheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useFontSize } from "@/hooks/use-font-size"
import { FONT_SIZE_OPTIONS } from "@/lib/constants/font-size"
import { cn } from "@/lib/utils"

// 各段落的預覽字級，讓選項本身就能看出大小差異
const OPTION_PREVIEW_CLASS = ["text-sm", "text-base", "text-lg"] as const

type FontSizeToggleProps = {
  // 選單以 Portal 掛到 body，脫離前台的 .site-theme 範圍，需由呼叫端補上主題色彩的 class
  contentClassName?: string
  className?: string
}

// 觸發按鈕的圖示固定不變，伺服器與客戶端輸出相同；選單項目只在開啟後於客戶端渲染，此時已能讀到實際設定
export function FontSizeToggle({ contentClassName, className }: FontSizeToggleProps) {
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
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className}
          aria-label="調整文字大小"
          title="調整文字大小"
        >
          <ALargeSmallIcon />
        </Button>
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

// 分段按鈕版本，供行動版選單面板直接切換；方向鍵可在選項間移動
export function FontSizeSegmented({ className }: { className?: string }) {
  const { fontSize, setFontSize } = useFontSize()
  const labelId = useId()

  // 單選群組再次點擊已選項目時會送出空字串，略過以維持一定有選項
  const handleValueChange = (value: string) => {
    if (value) setFontSize(value)
  }

  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <span id={labelId} className="text-sm text-muted-foreground">
        文字大小
      </span>
      <ToggleGroup.Root
        type="single"
        value={fontSize}
        onValueChange={handleValueChange}
        aria-labelledby={labelId}
        className="inline-flex rounded-lg border bg-muted/50 p-0.5"
      >
        {FONT_SIZE_OPTIONS.map(({ value, label }) => (
          <ToggleGroup.Item
            key={value}
            value={value}
            aria-label={`文字大小：${label}`}
            className="rounded-md px-3 py-1 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 data-[state=on]:bg-background data-[state=on]:font-medium data-[state=on]:text-foreground data-[state=on]:shadow-sm"
          >
            {label}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
    </div>
  )
}
