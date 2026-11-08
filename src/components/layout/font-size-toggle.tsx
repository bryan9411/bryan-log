"use client"

import dynamic from "next/dynamic"
import { useState } from "react"

import { FontSizeToggleButton } from "@/components/layout/font-size-toggle-button"
import { useFontSize } from "@/hooks/use-font-size"

const loadFontSizeMenu = () => import("@/components/layout/font-size-menu")

const preloadFontSizeMenu = () => void loadFontSizeMenu()

const FontSizeMenu = dynamic(() => loadFontSizeMenu().then((module) => module.FontSizeMenu), {
  ssr: false,
  loading: () => <FontSizeToggleButton />,
})

type FontSizeToggleProps = {
  // 選單以 Portal 掛到 body，脫離前台的 .site-theme 範圍，需由呼叫端補上主題色彩的 class
  contentClassName?: string
  className?: string
}

// 首屏只輸出按鈕，下拉選單的程式等使用者靠近或點擊時才下載
export function FontSizeToggle({ contentClassName, className }: FontSizeToggleProps) {
  // 維持跨分頁同步字級：另一個分頁改了設定，本頁尚未開過選單也要跟著套用
  useFontSize()

  const [isActivated, setIsActivated] = useState(false)

  if (isActivated) {
    return <FontSizeMenu contentClassName={contentClassName} triggerClassName={className} />
  }

  return (
    <FontSizeToggleButton
      className={className}
      onPointerEnter={preloadFontSizeMenu}
      onFocus={preloadFontSizeMenu}
      onClick={() => setIsActivated(true)}
    />
  )
}
