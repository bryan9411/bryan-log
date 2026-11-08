import { MoonIcon, SunIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

// 圖示交由 CSS `dark:` 變體切換，伺服器與客戶端輸出相同，不需 mounted 判斷即可避免 hydration 錯誤
export function ThemeToggleButton(props: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      aria-label="切換佈景主題"
      title="切換佈景主題"
      {...props}
    >
      <SunIcon className="scale-100 rotate-0 transition-transform dark:scale-0 dark:-rotate-90" />
      <MoonIcon className="absolute scale-0 rotate-90 transition-transform dark:scale-100 dark:rotate-0" />
    </Button>
  )
}
