"use client"

import { DropdownMenu } from "radix-ui"
import { CheckIcon, MonitorIcon, MoonIcon, SunIcon, type LucideIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { THEME, themeSchema, type Theme } from "@/lib/constants/theme"
import { cn } from "@/lib/utils"

const THEME_OPTIONS: Array<{ value: Theme; label: string; icon: LucideIcon }> = [
  { value: THEME.LIGHT, label: "淺色", icon: SunIcon },
  { value: THEME.DARK, label: "深色", icon: MoonIcon },
  { value: THEME.SYSTEM, label: "跟隨系統", icon: MonitorIcon },
]

type ThemeToggleProps = {
  // 選單以 Portal 掛到 body，脫離前台的 .site-theme 範圍，需由呼叫端補上主題色彩的 class
  contentClassName?: string
}

// 觸發按鈕的圖示交由 CSS `dark:` 變體切換，伺服器與客戶端輸出相同，不需 mounted 判斷即可避免 hydration 錯誤；
// 選單項目只在開啟後於客戶端渲染，此時已能讀到使用者實際選擇的主題
export function ThemeToggle({ contentClassName }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()

  const handleValueChange = (value: string) => {
    const result = themeSchema.safeParse(value)
    if (result.success) setTheme(result.data)
  }

  const renderOption = ({ value, label, icon: Icon }: (typeof THEME_OPTIONS)[number]) => (
    <DropdownMenu.RadioItem
      key={value}
      value={value}
      className="relative flex cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm outline-none select-none data-highlighted:bg-muted data-[state=checked]:font-medium"
    >
      <Icon className="size-4 text-muted-foreground" aria-hidden />
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
          className="relative"
          aria-label="切換佈景主題"
          title="切換佈景主題"
        >
          <SunIcon className="scale-100 rotate-0 transition-transform dark:scale-0 dark:-rotate-90" />
          <MoonIcon className="absolute scale-0 rotate-90 transition-transform dark:scale-100 dark:rotate-0" />
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
            佈景主題
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={theme} onValueChange={handleValueChange}>
            {THEME_OPTIONS.map(renderOption)}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
