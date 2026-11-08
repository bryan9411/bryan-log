"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, toast, type ToasterProps } from "sonner"

import { isTheme, THEME } from "@/lib/constants/theme"

// 延遲載入時 toast 與 Toaster 必須來自同一個模組，由此處一併匯出
export { toast }

// 依 next-themes 目前的主題切換 Toast 配色，並沿用網站的色彩變數
export function Toaster(props: ToasterProps) {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={isTheme(theme) ? theme : THEME.SYSTEM}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}
