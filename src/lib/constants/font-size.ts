import { z } from "zod"

export const FONT_SIZE = {
  NORMAL: "normal",
  LARGE: "large",
  XLARGE: "xlarge",
} as const

export const fontSizeSchema = z.enum([FONT_SIZE.NORMAL, FONT_SIZE.LARGE, FONT_SIZE.XLARGE])

export type FontSize = z.infer<typeof fontSizeSchema>

export const FONT_SIZE_OPTIONS: Array<{ value: FontSize; label: string }> = [
  { value: FONT_SIZE.NORMAL, label: "標準" },
  { value: FONT_SIZE.LARGE, label: "大" },
  { value: FONT_SIZE.XLARGE, label: "特大" },
]

// 前後台共用同一個設定：字級屬於使用者的閱讀習慣，不因所在頁面而不同
export const FONT_SIZE_STORAGE_KEY = "bryan-log-font-size"

// 寫在 <html> 上的屬性，globals.css 依此調整根字級，所有 rem / em 單位隨之縮放
export const FONT_SIZE_ATTRIBUTE = "data-font-size"

// 於 hydration 前同步執行，先套用已儲存的字級以避免載入時字級閃動；
// 只接受白名單內的值，標準字級不寫屬性
export const FONT_SIZE_INIT_SCRIPT = `(function(){try{var v=localStorage.getItem(${JSON.stringify(
  FONT_SIZE_STORAGE_KEY,
)});if(v===${JSON.stringify(FONT_SIZE.LARGE)}||v===${JSON.stringify(
  FONT_SIZE.XLARGE,
)})document.documentElement.setAttribute(${JSON.stringify(FONT_SIZE_ATTRIBUTE)},v)}catch(e){}})()`
