"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"

import { THEME, THEME_STORAGE_KEY } from "@/lib/constants/theme"

type ThemeProviderProps = {
  children: React.ReactNode
}

// next-themes 會在 hydration 前注入阻塞腳本設定 class，搭配 <html suppressHydrationWarning> 避免閃爍與不一致警告
export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={THEME.SYSTEM}
      storageKey={THEME_STORAGE_KEY}
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
