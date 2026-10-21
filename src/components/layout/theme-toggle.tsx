"use client"

import { MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { THEME } from "@/lib/constants/theme"

// 圖示切換交由 CSS `dark:` 變體處理，伺服器與客戶端輸出完全相同，不需 mounted 判斷即可避免 hydration 錯誤
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  const nextTheme = resolvedTheme === THEME.DARK ? THEME.LIGHT : THEME.DARK

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      aria-label="切換深色／淺色模式"
      title="切換深色／淺色模式"
      onClick={() => setTheme(nextTheme)}
    >
      <SunIcon className="scale-100 rotate-0 transition-transform dark:scale-0 dark:-rotate-90" />
      <MoonIcon className="absolute scale-0 rotate-90 transition-transform dark:scale-100 dark:rotate-0" />
    </Button>
  )
}
