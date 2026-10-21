import { getPublicEnv } from "@/lib/env"
import { STORAGE_BUCKET, type StorageFolder } from "@/lib/storage/constants"

const PUBLIC_OBJECT_PATH = "/storage/v1/object/public"

// 檔名一律改用 UUID：避免中文檔名編碼問題，也防止覆蓋既有檔案與路徑穿越
export function buildObjectPath(folder: StorageFolder, extension: string, now = new Date()) {
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, "0")

  return `${folder}/${year}/${month}/${crypto.randomUUID()}.${extension}`
}

export function getPublicUrlPrefix() {
  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv()
  const origin = NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, "")

  return `${origin}${PUBLIC_OBJECT_PATH}/${STORAGE_BUCKET}/`
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// 從 HTML 或網址字串中擷取所有指向本儲存桶的物件路徑（去除查詢參數與錨點）
export function extractStoragePaths(
  text: string | null | undefined,
  prefix = getPublicUrlPrefix(),
) {
  const paths = new Set<string>()
  if (!text) return paths

  const pattern = new RegExp(`${escapeRegExp(prefix)}([^"'\\s)<>?#]+)`, "g")

  for (const match of text.matchAll(pattern)) {
    try {
      paths.add(decodeURIComponent(match[1]))
    } catch {
      paths.add(match[1])
    }
  }

  return paths
}
