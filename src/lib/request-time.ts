import "server-only"

import { connection } from "next/server"

// 先以 connection() 宣告此處為請求期間的動態渲染，再讀取目前時間，避免預渲染時把時間固化在靜態 HTML 中
export async function getRequestTime() {
  await connection()
  return Date.now()
}
