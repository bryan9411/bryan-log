"use client"

import dynamic from "next/dynamic"
import { useState } from "react"

import { ThemeToggleButton } from "@/components/layout/theme-toggle-button"

const loadThemeMenu = () => import("@/components/layout/theme-menu")

const ThemeMenu = dynamic(() => loadThemeMenu().then((module) => module.ThemeMenu), {
  ssr: false,
  loading: () => <ThemeToggleButton />,
})

const preloadThemeMenu = () => void loadThemeMenu()

type ThemeToggleProps = {
  // 選單以 Portal 掛到 body，脫離前台的 .site-theme 範圍，需由呼叫端補上主題色彩的 class
  contentClassName?: string
}

// 首屏只輸出按鈕，下拉選單的程式等使用者靠近或點擊時才下載
export function ThemeToggle({ contentClassName }: ThemeToggleProps) {
  const [isActivated, setIsActivated] = useState(false)

  if (isActivated) return <ThemeMenu contentClassName={contentClassName} />

  return (
    <ThemeToggleButton
      onPointerEnter={preloadThemeMenu}
      onFocus={preloadThemeMenu}
      onClick={() => setIsActivated(true)}
    />
  )
}
