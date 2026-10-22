import { z } from "zod"

import { SLUG_MAX_LENGTH, SLUG_PATTERN } from "@/lib/content/slug"
import { postIntentSchema } from "@/lib/validations/post"

// 與資料庫 check constraint 一致
export const PROJECT_TITLE_MAX_LENGTH = 120
export const PROJECT_SUMMARY_MAX_LENGTH = 300
export const TECH_STACK_MAX_ITEMS = 20
export const TECH_TAG_MAX_LENGTH = 30
export const PROJECT_URL_MAX_LENGTH = 500

// 技術標籤在表單中以同名欄位重複出現，讀取時需用 getAll
export const TECH_STACK_FIELD = "techStack"

// 草稿／發布與文章共用同一組操作
export const PROJECT_INTENT = postIntentSchema.enum

const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value)

const optionalHttpUrl = (message: string) =>
  z.preprocess(
    emptyToUndefined,
    z
      .url({ protocol: /^https?$/, error: message })
      .max(PROJECT_URL_MAX_LENGTH, `網址不可超過 ${PROJECT_URL_MAX_LENGTH} 字`)
      .optional(),
  )

export const projectFormSchema = z.object({
  id: z.preprocess(emptyToUndefined, z.uuid("作品識別碼不正確").optional()),
  title: z
    .string({ error: "請輸入專案名稱" })
    .trim()
    .min(1, "請輸入專案名稱")
    .max(PROJECT_TITLE_MAX_LENGTH, `專案名稱不可超過 ${PROJECT_TITLE_MAX_LENGTH} 字`),
  slug: z
    .string({ error: "請輸入網址代稱" })
    .trim()
    .min(1, "請輸入網址代稱")
    .max(SLUG_MAX_LENGTH, `網址代稱不可超過 ${SLUG_MAX_LENGTH} 字`)
    .regex(SLUG_PATTERN, "網址代稱僅能使用小寫英文、數字與連字號，且不可以連字號開頭或結尾"),
  summary: z
    .string({ error: "請輸入專案簡介" })
    .trim()
    .min(1, "請輸入專案簡介")
    .max(PROJECT_SUMMARY_MAX_LENGTH, `簡介不可超過 ${PROJECT_SUMMARY_MAX_LENGTH} 字`),
  demoUrl: optionalHttpUrl("展示連結格式不正確，需以 http:// 或 https:// 開頭"),
  repoUrl: optionalHttpUrl("原始碼連結格式不正確，需以 http:// 或 https:// 開頭"),
  techStack: z
    .array(
      z
        .string()
        .trim()
        .min(1, "技術標籤不可為空白")
        .max(TECH_TAG_MAX_LENGTH, `每個技術標籤不可超過 ${TECH_TAG_MAX_LENGTH} 字`),
    )
    .max(TECH_STACK_MAX_ITEMS, `技術標籤最多 ${TECH_STACK_MAX_ITEMS} 個`)
    // 不分大小寫去除重複，保留第一次輸入的寫法
    .transform((tags) =>
      tags.filter(
        (tag, index) =>
          tags.findIndex((other) => other.toLowerCase() === tag.toLowerCase()) === index,
      ),
    ),
  categoryId: z.preprocess(emptyToUndefined, z.uuid("請重新選擇分類").optional()),
  coverImageUrl: z.preprocess(
    emptyToUndefined,
    z.url({ protocol: /^https?$/, error: "預覽圖網址不正確，請重新上傳" }).optional(),
  ),
  // 核取方塊勾選時送出 "on"，未勾選時不會出現在表單中
  isFeatured: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
  intent: postIntentSchema,
})

export type ProjectFormInput = z.input<typeof projectFormSchema>

export type ProjectField = keyof ProjectFormInput

export const PROJECT_FIELDS = Object.keys(projectFormSchema.shape) as ProjectField[]
