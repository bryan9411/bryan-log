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
