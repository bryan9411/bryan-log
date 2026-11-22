// 各模組同步函式的回傳格式：count 為同步後的項目數，details 會原樣出現在 Cron 的 JSON 回應中
export type RadarSyncResult = {
  count: number
  details?: Record<string, number>
}
