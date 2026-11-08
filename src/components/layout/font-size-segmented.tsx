"use client"

import { useId } from "react"
import { ToggleGroup } from "radix-ui"

import { useFontSize } from "@/hooks/use-font-size"
import { FONT_SIZE_OPTIONS } from "@/lib/constants/font-size"
import { cn } from "@/lib/utils"

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
