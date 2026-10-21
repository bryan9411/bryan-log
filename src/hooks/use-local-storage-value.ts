"use client"

import { useSyncExternalStore } from "react"

// 原生 storage 事件只會通知「其他分頁」，同一分頁的寫入需自行派發事件
const SAME_TAB_EVENT = "local-storage-change"

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange)
  window.addEventListener(SAME_TAB_EVENT, onChange)

  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener(SAME_TAB_EVENT, onChange)
  }
}

function readItem(key: string) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeLocalStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
    window.dispatchEvent(new Event(SAME_TAB_EVENT))
    return true
  } catch {
    // 無痕模式或容量已滿時寫入會失敗，呼叫端需自行處理
    return false
  }
}

export function removeLocalStorage(key: string) {
  try {
    window.localStorage.removeItem(key)
    window.dispatchEvent(new Event(SAME_TAB_EVENT))
  } catch {
    // 忽略無法存取 localStorage 的環境
  }
}

// 以 useSyncExternalStore 讀取，伺服器端與 hydration 期間一律回傳 null，避免畫面不一致
export function useLocalStorageValue(key: string) {
  return useSyncExternalStore(
    subscribe,
    () => readItem(key),
    () => null,
  )
}
