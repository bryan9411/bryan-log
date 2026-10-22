import { z } from "zod"

import { SLUG_MAX_LENGTH, SLUG_PATTERN } from "@/lib/content/slug"

export const POST_TITLE_MAX_LENGTH = 120
export const POST_EXCERPT_MAX_LENGTH = 300

// TL;DR 核心速讀：每點一句，與資料庫 posts_tldr_max_items 限制一致
export const TLDR_MAX_ITEMS = 5
export const TLDR_ITEM_MAX_LENGTH = 120
const TLDR_INPUT_MAX_LENGTH = TLDR_MAX_ITEMS * (TLDR_ITEM_MAX_LENGTH + 2)

// 表單以多行文字輸入，每行一點；去除前後空白、項目符號與空行
// 數字編號需後接空白（或全形頓號），避免「3.5 倍效能」這類開頭數字被誤刪
const TLDR_BULLET_PATTERN = /^\s*(?:[-*•・]\s*|\d+[.)]\s+|\d+、\s*)/

export function parseTldrLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(TLDR_BULLET_PATTERN, "").trim())
    .filter(Boolean)
}

// 約 2MB：足以容納萬字長文的 JSON，同時阻擋異常巨大的請求
const CONTENT_JSON_MAX_LENGTH = 2_000_000

export const POST_INTENT = {
  SAVE_DRAFT: "draft",
  PUBLISH: "publish",
} as const

export const postIntentSchema = z.enum([POST_INTENT.SAVE_DRAFT, POST_INTENT.PUBLISH], {
  error: "未知的操作，請重新整理頁面後再試",
})

export type PostIntent = z.infer<typeof postIntentSchema>

// 表單未填的欄位會以空字串送出，統一轉為 undefined 再驗證
const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value)

export const postFormSchema = z.object({
  id: z.preprocess(emptyToUndefined, z.uuid("文章識別碼不正確").optional()),
  title: z
    .string({ error: "請輸入文章標題" })
    .trim()
    .min(1, "請輸入文章標題")
    .max(POST_TITLE_MAX_LENGTH, `標題不可超過 ${POST_TITLE_MAX_LENGTH} 字`),
  slug: z
    .string({ error: "請輸入網址代稱" })
    .trim()
    .min(1, "請輸入網址代稱")
    .max(SLUG_MAX_LENGTH, `網址代稱不可超過 ${SLUG_MAX_LENGTH} 字`)
    .regex(SLUG_PATTERN, "網址代稱僅能使用小寫英文、數字與連字號，且不可以連字號開頭或結尾"),
  excerpt: z
    .string()
    .trim()
    .max(POST_EXCERPT_MAX_LENGTH, `摘要不可超過 ${POST_EXCERPT_MAX_LENGTH} 字`)
    .default(""),
  tldr: z
    .string()
    .max(TLDR_INPUT_MAX_LENGTH, "TL;DR 內容過長")
    .default("")
    .transform(parseTldrLines)
    .pipe(
      z
        .array(
          z.string().max(TLDR_ITEM_MAX_LENGTH, `TL;DR 每點不可超過 ${TLDR_ITEM_MAX_LENGTH} 字`),
        )
        .max(TLDR_MAX_ITEMS, `TL;DR 最多 ${TLDR_MAX_ITEMS} 點`),
    ),
  categoryId: z.preprocess(emptyToUndefined, z.uuid("請重新選擇分類").optional()),
  coverImageUrl: z.preprocess(
    emptyToUndefined,
    z.url({ protocol: /^https?$/, error: "封面圖片網址不正確，請重新上傳" }).optional(),
  ),
  contentJson: z
    .string({ error: "文章內容遺失，請重新整理頁面" })
    .max(CONTENT_JSON_MAX_LENGTH, "文章內容過長，請拆分為多篇文章")
    .transform((value, context) => {
      try {
        return JSON.parse(value) as unknown
      } catch {
        context.addIssue({ code: "custom", message: "文章內容格式不正確，請重新整理頁面" })
        return z.NEVER
      }
    }),
  intent: postIntentSchema,
})

export type PostFormInput = z.input<typeof postFormSchema>

export type PostField = keyof PostFormInput

export const POST_FIELDS = Object.keys(postFormSchema.shape) as PostField[]
