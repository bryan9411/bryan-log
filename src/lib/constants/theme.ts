export const THEME = {
  LIGHT: "light",
  DARK: "dark",
  SYSTEM: "system",
} as const

export type Theme = (typeof THEME)[keyof typeof THEME]

// 此檔會進入所有頁面的前端程式，以簡單判斷取代 zod，避免全站多載入一份驗證函式庫
export function isTheme(value: unknown): value is Theme {
  return Object.values<unknown>(THEME).includes(value)
}

export const THEME_STORAGE_KEY = "bryan-log-theme"
