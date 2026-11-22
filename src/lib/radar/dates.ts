const DAY_MS = 24 * 60 * 60 * 1000
const TAIPEI_UTC_OFFSET_MS = 8 * 60 * 60 * 1000

// 快照日期以台灣時間計算：排程在台灣 02:00 左右執行，同一天重跑會覆寫當天的快照
export function taipeiDate(now: number, offsetDays = 0) {
  return new Date(now + TAIPEI_UTC_OFFSET_MS + offsetDays * DAY_MS).toISOString().slice(0, 10)
}

export function daysAgoIso(now: number, days: number) {
  return new Date(now - days * DAY_MS).toISOString()
}

// GitHub Search 的日期條件格式，例如 created:>2026-10-23
export function daysAgoDate(now: number, days: number) {
  return daysAgoIso(now, days).slice(0, 10)
}
