"use server"

import { headers } from "next/headers"
import { z } from "zod"

import { getClientIp } from "@/lib/client-ip"
import { VIEW_COOLDOWN_MS } from "@/lib/constants/post-views"
import { SLUG_MAX_LENGTH, SLUG_PATTERN } from "@/lib/content/slug"
import { createRateLimiter } from "@/lib/rate-limit"
import { createPublicClient } from "@/lib/supabase/public"

const slugSchema = z.string().max(SLUG_MAX_LENGTH).regex(SLUG_PATTERN)

const BURST_WINDOW_MS = 60 * 1000
const BURST_LIMIT = 20
const MAX_TRACKED_KEYS = 10_000

// 同一來源一分鐘內最多累加 20 次（不分文章），擋下以腳本快速掃過大量文章的行為
const burstLimiter = createRateLimiter({
  limit: BURST_LIMIT,
  windowMs: BURST_WINDOW_MS,
  maxKeys: MAX_TRACKED_KEYS,
})

// 同一來源對同一篇文章 24 小時內只累加一次，與瀏覽器端冷卻時間一致；
// 清除 LocalStorage 或直接呼叫此動作也無法重複灌水
const articleLimiter = createRateLimiter({
  limit: 1,
  windowMs: VIEW_COOLDOWN_MS,
  maxKeys: MAX_TRACKED_KEYS,
})

// 無法辨識來源時不做 IP 限制，避免所有用戶共用同一個計數而被誤擋，此時仍有瀏覽器端冷卻
async function isViewAllowed(slug: string) {
  const ip = getClientIp(await headers())
  if (!ip) return true

  return burstLimiter(ip) && articleLimiter(`${ip}:${slug}`)
}

// 匿名身分即可執行：increment_post_view 為 SECURITY DEFINER，只會對已發布文章 +1，
// 而 RLS 也只允許匿名讀取已發布文章的瀏覽數，無法藉此探測草稿
async function readViewCount(slug: string) {
  const { data, error } = await createPublicClient()
    .from("posts")
    .select("view_count")
    .eq("slug", slug)
    .maybeSingle()

  if (error || !data) return null
  return data.view_count
}

// 參數來自瀏覽器，先以與資料庫相同的 slug 規則驗證，不合法時直接略過；
// 超過頻率限制時不累加，但仍回傳目前的瀏覽數，畫面行為與正常情況一致
export async function recordPostView(slug: string): Promise<number | null> {
  const parsed = slugSchema.safeParse(slug)
  if (!parsed.success) return null

  if (!(await isViewAllowed(parsed.data))) return readViewCount(parsed.data)

  const { error } = await createPublicClient().rpc("increment_post_view", {
    target_slug: parsed.data,
  })

  if (error) return null
  return readViewCount(parsed.data)
}

// 冷卻時間內重複造訪時只讀取最新數字，不再累加
export async function getPostViewCount(slug: string): Promise<number | null> {
  const parsed = slugSchema.safeParse(slug)
  if (!parsed.success) return null

  return readViewCount(parsed.data)
}
