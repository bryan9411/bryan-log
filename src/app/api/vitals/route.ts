import { getClientIp } from "@/lib/client-ip"
import { rateWebVital } from "@/lib/constants/web-vitals"
import { createRateLimiter } from "@/lib/rate-limit"
import { createPublicClient } from "@/lib/supabase/public"
import { webVitalsPayloadSchema } from "@/lib/validations/web-vitals"

// 一次回報最多 10 筆指標，正常內容遠小於此；過大的請求直接拒絕，不解析內容
const MAX_BODY_BYTES = 4 * 1024

// 每次完整載入頁面約回報 1～2 次，同一來源一分鐘 30 次已足夠正常瀏覽，超過即視為灌資料
const limiter = createRateLimiter({ limit: 30, windowMs: 60 * 1000, maxKeys: 10_000 })

const noContent = () => new Response(null, { status: 204 })

// 由前台以 navigator.sendBeacon 送出，瀏覽器不會讀取回應；
// 因此格式錯誤或超過頻率時一律靜默略過，不回傳細節給可能的濫用者
export async function POST(request: Request) {
  const ip = getClientIp(request.headers)
  if (ip && !limiter(ip)) return noContent()

  const body = await request.text()
  if (body.length > MAX_BODY_BYTES) return new Response(null, { status: 413 })

  let json: unknown
  try {
    json = JSON.parse(body)
  } catch {
    return new Response(null, { status: 400 })
  }

  const parsed = webVitalsPayloadSchema.safeParse(json)
  if (!parsed.success) return new Response(null, { status: 400 })

  // 評級由伺服器依官方門檻計算，不採信用戶端送來的值
  const entries = parsed.data.entries.map((entry) => ({
    ...entry,
    rating: rateWebVital(entry.metric, entry.value),
  }))

  const { error } = await createPublicClient().rpc("record_web_vitals", { entries })
  if (error) console.error(`寫入 Web Vitals 失敗：${error.message}`)

  return noContent()
}
