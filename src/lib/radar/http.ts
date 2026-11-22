import "server-only"

const DEFAULT_TIMEOUT_MS = 20_000
// 錯誤訊息會寫進 radar_modules.last_sync_error 並顯示在後台，回應內容只保留開頭
const MAX_ERROR_BODY_LENGTH = 300

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = "HttpError"
  }
}

type FetchJsonOptions = RequestInit & {
  timeoutMs?: number
  // 這些狀態碼不視為錯誤，回傳 null（例如 npm 查無套件的 404）
  allowStatus?: number[]
}

// 外部 API 一律設定逾時，避免單一請求卡住整個排程（Vercel 函式最長 300 秒）
export async function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T | null> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, allowStatus = [], ...init } = options
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (allowStatus.includes(response.status)) return null

  if (!response.ok) {
    const body = (await response.text().catch(() => "")).slice(0, MAX_ERROR_BODY_LENGTH)
    const { origin, pathname } = new URL(url)
    throw new HttpError(
      `${origin}${pathname} 回應 ${response.status}${body ? `：${body}` : ""}`,
      response.status,
    )
  }

  return (await response.json()) as T
}

// 以固定併發數執行非同步工作，避免同時對外部 API 發出過多請求
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let nextIndex = 0

  const run = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++
      results[index] = await worker(items[index])
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run))
  return results
}

export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}
