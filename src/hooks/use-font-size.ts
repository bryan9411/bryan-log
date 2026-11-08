"use client"

import { useEffect } from "react"

import { useLocalStorageValue, writeLocalStorage } from "@/hooks/use-local-storage-value"
import {
  FONT_SIZE,
  FONT_SIZE_ATTRIBUTE,
  FONT_SIZE_STORAGE_KEY,
  isFontSize,
  type FontSize,
} from "@/lib/constants/font-size"

function applyFontSize(fontSize: FontSize) {
  const root = document.documentElement
  if (fontSize === FONT_SIZE.NORMAL) root.removeAttribute(FONT_SIZE_ATTRIBUTE)
  else root.setAttribute(FONT_SIZE_ATTRIBUTE, fontSize)
}

// 尚未設定或伺服器端渲染時視為標準字級；頁面載入時的初始字級由 layout 的 inline script 套用
export function useFontSize() {
  const stored = useLocalStorageValue(FONT_SIZE_STORAGE_KEY)
  const storedFontSize = isFontSize(stored) ? stored : null

  // 其他分頁變更設定時同步套用到本頁；hydration 期間讀到的 null 不可套用，否則會清掉 inline script 已設定的字級
  useEffect(() => {
    if (storedFontSize) applyFontSize(storedFontSize)
  }, [storedFontSize])

  const setFontSize = (value: string) => {
    if (!isFontSize(value)) return
    // 即使無法寫入 localStorage（無痕模式等），本次瀏覽仍要立即生效
    applyFontSize(value)
    writeLocalStorage(FONT_SIZE_STORAGE_KEY, value)
  }

  return { fontSize: storedFontSize ?? FONT_SIZE.NORMAL, setFontSize }
}
