// 中文閱讀速度約每分鐘 300～400 字，取中間值；種子資料產生器與後台存檔共用同一套計算
export const CHARACTERS_PER_MINUTE = 350

export function estimateReadingMinutes(textLength: number) {
  return Math.max(1, Math.ceil(textLength / CHARACTERS_PER_MINUTE))
}
