"use client"

import { useSyncExternalStore } from "react"

const APPLE_PLATFORM_PATTERN = /mac|iphone|ipad|ipod/i

export const SHORTCUT_MODIFIER = {
  APPLE: "⌘",
  OTHER: "Ctrl",
} as const

export type ShortcutModifier = (typeof SHORTCUT_MODIFIER)[keyof typeof SHORTCUT_MODIFIER]

function subscribe() {
  return () => {}
}

function getSnapshot(): ShortcutModifier {
  return APPLE_PLATFORM_PATTERN.test(navigator.userAgent)
    ? SHORTCUT_MODIFIER.APPLE
    : SHORTCUT_MODIFIER.OTHER
}

// 伺服器不知道訪客的作業系統，回傳 null 讓呼叫端先不顯示快捷鍵提示，hydration 後再補上
export function useShortcutModifier() {
  return useSyncExternalStore<ShortcutModifier | null>(subscribe, getSnapshot, () => null)
}
