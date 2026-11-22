// 資料表不存在：Postgres 42P01；PostgREST 結構描述快取找不到資料表時回 PGRST205
// 用於「程式已部署、遷移檔還沒執行」的過渡期，讓既有功能照常運作
const MISSING_TABLE_CODES = new Set(["42P01", "PGRST205"])

export function isMissingTableError(error: { code?: string } | null | undefined) {
  return Boolean(error?.code && MISSING_TABLE_CODES.has(error.code))
}
