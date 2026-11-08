"use client"

import { DropdownMenu } from "radix-ui"
import { CheckIcon, MonitorIcon, MoonIcon, SunIcon, type LucideIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { ThemeToggleButton } from "@/components/layout/theme-toggle-button"
import { isTheme, THEME, type Theme } from "@/lib/constants/theme"
import { cn } from "@/lib/utils"

const THEME_OPTIONS: Array<{ value: Theme; label: string; icon: LucideIcon }> = [
  { value: THEME.LIGHT, label: "淺色", icon: SunIcon },
  { value: THEME.DARK, label: "深色", icon: MoonIcon },
  { value: THEME.SYSTEM, label: "跟隨系統", icon: MonitorIcon },
]

type ThemeMenuProps = {
  contentClassName?: string
}

// 第一次點擊主題按鈕時才載入，載入後直接以開啟狀態出現
export function ThemeMenu({ contentClassName }: ThemeMenuProps) {
  const { theme, setTheme } = useTheme()

  const handleValueChange = (value: string) => {
    if (isTheme(value)) setTheme(value)
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
    <DropdownMenu.Root modal={false} defaultOpen>
      <DropdownMenu.Trigger asChild>
        <ThemeToggleButton />
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
