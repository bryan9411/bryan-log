"use server"

import { z } from "zod"

import { SLUG_MAX_LENGTH, SLUG_PATTERN } from "@/lib/content/slug"
import { createPublicClient } from "@/lib/supabase/public"

const slugSchema = z.string().max(SLUG_MAX_LENGTH).regex(SLUG_PATTERN)

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

// 參數來自瀏覽器，先以與資料庫相同的 slug 規則驗證，不合法時直接略過
export async function recordPostView(slug: string): Promise<number | null> {
  const parsed = slugSchema.safeParse(slug)
  if (!parsed.success) return null

  const { error } = await createPublicClient().rpc("increment_post_view", {
    target_slug: parsed.data,
  })

  if (error) return null
  return readViewCount(parsed.data)
}

// 同一分頁工作階段內重複造訪時只讀取最新數字，不再累加
export async function getPostViewCount(slug: string): Promise<number | null> {
  const parsed = slugSchema.safeParse(slug)
  if (!parsed.success) return null

  return readViewCount(parsed.data)
}
