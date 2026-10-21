import { z } from "zod"

// 與資料庫 enum `post_status` 保持一致，文章與作品共用
export const CONTENT_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
} as const

export const contentStatusSchema = z.enum([CONTENT_STATUS.DRAFT, CONTENT_STATUS.PUBLISHED])

export type ContentStatus = z.infer<typeof contentStatusSchema>

export const CONTENT_STATUS_LABEL: Record<ContentStatus, string> = {
  [CONTENT_STATUS.DRAFT]: "草稿",
  [CONTENT_STATUS.PUBLISHED]: "已發布",
}

// 與資料庫 enum `category_type` 保持一致
export const CATEGORY_TYPE = {
  POST: "post",
  PROJECT: "project",
} as const

export const categoryTypeSchema = z.enum([CATEGORY_TYPE.POST, CATEGORY_TYPE.PROJECT])

export type CategoryType = z.infer<typeof categoryTypeSchema>

export const CATEGORY_TYPE_LABEL: Record<CategoryType, string> = {
  [CATEGORY_TYPE.POST]: "技術文章",
  [CATEGORY_TYPE.PROJECT]: "精選專案",
}
