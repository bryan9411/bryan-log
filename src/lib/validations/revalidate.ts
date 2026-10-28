import { z } from "zod"

import { CACHE_TAG, type CacheTag } from "@/lib/cache-tags"

export const REVALIDATE_PATH_MAX_LENGTH = 200

// revalidatePath 的 type：一般網址不需指定；含 [slug] 等動態片段時必須指定 page 或 layout
export const REVALIDATE_TYPE = {
  AUTO: "auto",
  PAGE: "page",
  LAYOUT: "layout",
} as const

export const revalidateTypeSchema = z.enum([
  REVALIDATE_TYPE.AUTO,
  REVALIDATE_TYPE.PAGE,
  REVALIDATE_TYPE.LAYOUT,
])

export type RevalidateType = z.infer<typeof revalidateTypeSchema>

export const REVALIDATE_TYPE_LABEL: Record<RevalidateType, string> = {
  [REVALIDATE_TYPE.AUTO]: "單一網址",
  [REVALIDATE_TYPE.PAGE]: "頁面（含動態路由）",
  [REVALIDATE_TYPE.LAYOUT]: "版型與其下所有頁面",
}

const DYNAMIC_SEGMENT_PATTERN = /\[[^\]/]+\]/
// 只允許站內路徑：英數、中文、常見符號與 [slug] 動態片段；不得含協定、查詢字串或 ..
const PATH_PATTERN = /^\/(?:[\p{L}\p{N}\-._~%@[\]]+\/?)*$/u

export const revalidatePathSchema = z
  .object({
    path: z
      .string({ error: "請輸入要重新驗證的路徑" })
      .trim()
      .min(1, "請輸入要重新驗證的路徑")
      .max(REVALIDATE_PATH_MAX_LENGTH, `路徑不可超過 ${REVALIDATE_PATH_MAX_LENGTH} 字`)
      .regex(PATH_PATTERN, "路徑需以 / 開頭，且只能是站內路徑（不含網域與查詢字串）")
      .refine((path) => !path.split("/").includes(".."), "路徑不可包含 ..")
      // 去除結尾斜線（根路徑除外），與 Next.js 的路由比對方式一致
      .transform((path) => (path.length > 1 ? path.replace(/\/+$/, "") : path)),
    type: revalidateTypeSchema.catch(REVALIDATE_TYPE.AUTO),
  })
  .refine(
    ({ path, type }) => !DYNAMIC_SEGMENT_PATTERN.test(path) || type !== REVALIDATE_TYPE.AUTO,
    { path: ["type"], message: "含有 [slug] 等動態片段的路徑，請選擇「頁面」或「版型」類型" },
  )

export type RevalidatePathInput = z.infer<typeof revalidatePathSchema>

export type RevalidateField = "path" | "type"

export const cacheTagSchema = z.enum(
  [CACHE_TAG.POSTS, CACHE_TAG.PROJECTS, CACHE_TAG.CATEGORIES, CACHE_TAG.SECTIONS],
  { error: "未知的快取標籤" },
)

export const CACHE_TAG_LABEL: Record<CacheTag, string> = {
  [CACHE_TAG.POSTS]: "文章資料",
  [CACHE_TAG.PROJECTS]: "作品資料",
  [CACHE_TAG.CATEGORIES]: "分類資料",
  [CACHE_TAG.SECTIONS]: "內容區塊（導覽列）",
}

export type RevalidatePreset = {
  label: string
  description: string
  path: string
  type: RevalidateType
}

// 一鍵預設：涵蓋前台主要頁面；「全站」以根版型重新驗證，影響範圍最大
export const REVALIDATE_PRESETS: RevalidatePreset[] = [
  { label: "首頁", description: "/", path: "/", type: REVALIDATE_TYPE.AUTO },
  {
    label: "所有區塊列表",
    description: "/[section]",
    path: "/[section]",
    type: REVALIDATE_TYPE.PAGE,
  },
  {
    label: "所有文章內頁",
    description: "/[section]/[slug]",
    path: "/[section]/[slug]",
    type: REVALIDATE_TYPE.PAGE,
  },
  { label: "文章歸檔", description: "/archives", path: "/archives", type: REVALIDATE_TYPE.AUTO },
  { label: "作品集列表", description: "/projects", path: "/projects", type: REVALIDATE_TYPE.AUTO },
  {
    label: "所有作品內頁",
    description: "/projects/[slug]",
    path: "/projects/[slug]",
    type: REVALIDATE_TYPE.PAGE,
  },
  {
    label: "Sitemap",
    description: "/sitemap.xml",
    path: "/sitemap.xml",
    type: REVALIDATE_TYPE.AUTO,
  },
  { label: "llms.txt", description: "/llms.txt", path: "/llms.txt", type: REVALIDATE_TYPE.AUTO },
  {
    label: "llms-full.txt",
    description: "/llms-full.txt",
    path: "/llms-full.txt",
    type: REVALIDATE_TYPE.AUTO,
  },
  { label: "全站", description: "/ （版型）", path: "/", type: REVALIDATE_TYPE.LAYOUT },
]
