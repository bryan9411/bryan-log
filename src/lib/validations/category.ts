import { z } from "zod"

import { categoryTypeSchema } from "@/lib/constants/content"
import { SLUG_MAX_LENGTH, SLUG_PATTERN } from "@/lib/content/slug"

// 與資料庫 check constraint 一致
export const CATEGORY_NAME_MAX_LENGTH = 50
export const CATEGORY_DESCRIPTION_MAX_LENGTH = 300
export const CATEGORY_SORT_ORDER_MIN = -9999
export const CATEGORY_SORT_ORDER_MAX = 9999

const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value)

export const categoryFormSchema = z.object({
  id: z.preprocess(emptyToUndefined, z.uuid("分類識別碼不正確").optional()),
  type: z.enum(categoryTypeSchema.options, { error: "分類類型不正確，請重新整理頁面" }),
  // 文章分類必填（所屬內容區塊），作品分類留空；兩者的對應關係於伺服器動作中檢查
  sectionId: z.preprocess(emptyToUndefined, z.uuid("所屬區塊不正確，請重新整理頁面").optional()),
  name: z
    .string({ error: "請輸入分類名稱" })
    .trim()
    .min(1, "請輸入分類名稱")
    .max(CATEGORY_NAME_MAX_LENGTH, `分類名稱不可超過 ${CATEGORY_NAME_MAX_LENGTH} 字`),
  slug: z
    .string({ error: "請輸入網址代稱" })
    .trim()
    .min(1, "請輸入網址代稱")
    .max(SLUG_MAX_LENGTH, `網址代稱不可超過 ${SLUG_MAX_LENGTH} 字`)
    .regex(SLUG_PATTERN, "網址代稱僅能使用小寫英文、數字與連字號，且不可以連字號開頭或結尾"),
  parentId: z.preprocess(emptyToUndefined, z.uuid("請重新選擇父分類").optional()),
  description: z
    .string()
    .trim()
    .max(CATEGORY_DESCRIPTION_MAX_LENGTH, `描述不可超過 ${CATEGORY_DESCRIPTION_MAX_LENGTH} 字`)
    .default(""),
  sortOrder: z.preprocess(
    (value) => (value === "" || value === null ? 0 : value),
    z.coerce
      .number({ error: "排序必須是數字" })
      .int("排序必須是整數")
      .min(CATEGORY_SORT_ORDER_MIN, `排序不可小於 ${CATEGORY_SORT_ORDER_MIN}`)
      .max(CATEGORY_SORT_ORDER_MAX, `排序不可大於 ${CATEGORY_SORT_ORDER_MAX}`),
  ),
})

export type CategoryFormInput = z.input<typeof categoryFormSchema>

export type CategoryField = keyof CategoryFormInput

export const CATEGORY_FIELDS = Object.keys(categoryFormSchema.shape) as CategoryField[]
