import { z } from "zod"

import { isReservedSectionSlug, RESERVED_SECTION_SLUGS } from "@/lib/constants/content"
import { SLUG_MAX_LENGTH, SLUG_PATTERN } from "@/lib/content/slug"

// 與資料庫 check constraint 一致
export const SECTION_NAME_MAX_LENGTH = 30
export const SECTION_DESCRIPTION_MAX_LENGTH = 300
export const SECTION_SORT_ORDER_MIN = -9999
export const SECTION_SORT_ORDER_MAX = 9999

const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value)

export const sectionFormSchema = z.object({
  id: z.preprocess(emptyToUndefined, z.uuid("區塊識別碼不正確").optional()),
  name: z
    .string({ error: "請輸入區塊名稱" })
    .trim()
    .min(1, "請輸入區塊名稱")
    .max(SECTION_NAME_MAX_LENGTH, `區塊名稱不可超過 ${SECTION_NAME_MAX_LENGTH} 字`),
  slug: z
    .string({ error: "請輸入網址代稱" })
    .trim()
    .min(1, "請輸入網址代稱")
    .max(SLUG_MAX_LENGTH, `網址代稱不可超過 ${SLUG_MAX_LENGTH} 字`)
    .regex(SLUG_PATTERN, "網址代稱僅能使用小寫英文、數字與連字號，且不可以連字號開頭或結尾")
    .refine(
      (slug) => !isReservedSectionSlug(slug),
      `「${RESERVED_SECTION_SLUGS.join("、")}」為系統保留網址，請換一個`,
    ),
  description: z
    .string()
    .trim()
    .max(SECTION_DESCRIPTION_MAX_LENGTH, `描述不可超過 ${SECTION_DESCRIPTION_MAX_LENGTH} 字`)
    .default(""),
  sortOrder: z.preprocess(
    (value) => (value === "" || value === null ? 0 : value),
    z.coerce
      .number({ error: "排序必須是數字" })
      .int("排序必須是整數")
      .min(SECTION_SORT_ORDER_MIN, `排序不可小於 ${SECTION_SORT_ORDER_MIN}`)
      .max(SECTION_SORT_ORDER_MAX, `排序不可大於 ${SECTION_SORT_ORDER_MAX}`),
  ),
})

export type SectionFormInput = z.input<typeof sectionFormSchema>

export type SectionField = keyof SectionFormInput

export const SECTION_FIELDS = Object.keys(sectionFormSchema.shape) as SectionField[]
