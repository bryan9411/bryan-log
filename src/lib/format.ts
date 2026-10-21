const BYTE_UNITS = ["B", "KB", "MB", "GB"] as const
const BYTE_BASE = 1024

export function formatBytes(bytes: number) {
  if (bytes <= 0) return "0 B"

  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(BYTE_BASE)),
    BYTE_UNITS.length - 1,
  )
  const value = bytes / BYTE_BASE ** exponent

  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${BYTE_UNITS[exponent]}`
}

const dateTimeFormatter = new Intl.DateTimeFormat("zh-TW", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Taipei",
})

export function formatDateTime(value: string | Date) {
  return dateTimeFormatter.format(new Date(value))
}

const relativeTimeFormatter = new Intl.RelativeTimeFormat("zh-TW", { numeric: "auto" })

const RELATIVE_TIME_UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
  { unit: "year", seconds: 365 * 24 * 60 * 60 },
  { unit: "month", seconds: 30 * 24 * 60 * 60 },
  { unit: "day", seconds: 24 * 60 * 60 },
  { unit: "hour", seconds: 60 * 60 },
  { unit: "minute", seconds: 60 },
  { unit: "second", seconds: 1 },
]

// 例如「5 秒前」、「3 天前」、「昨天」；now 由呼叫端傳入，方便在伺服器與客戶端控制取值時機
export function formatRelativeTime(value: string | number | Date, now: number) {
  const elapsedSeconds = Math.round((new Date(value).getTime() - now) / 1000)
  const { unit, seconds } =
    RELATIVE_TIME_UNITS.find((item) => Math.abs(elapsedSeconds) >= item.seconds) ??
    RELATIVE_TIME_UNITS[RELATIVE_TIME_UNITS.length - 1]

  return relativeTimeFormatter.format(Math.trunc(elapsedSeconds / seconds), unit)
}

const dateFormatter = new Intl.DateTimeFormat("zh-TW", {
  dateStyle: "medium",
  timeZone: "Asia/Taipei",
})

export function formatDate(value: string | Date) {
  return dateFormatter.format(new Date(value))
}
