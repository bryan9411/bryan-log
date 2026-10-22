"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

import { themeSchema, THEME } from "@/lib/constants/theme"

// 依 next-themes 目前的主題切換 Toast 配色，並沿用網站的色彩變數
export function Toaster(props: ToasterProps) {
  const { theme } = useTheme()
  const parsedTheme = themeSchema.safeParse(theme)

  return (
    <Sonner
      theme={parsedTheme.success ? parsedTheme.data : THEME.SYSTEM}
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
