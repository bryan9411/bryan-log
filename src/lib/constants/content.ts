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

// 後台儀表板分類占比圖的標題，與側邊欄的「文章分類」「專案分類」一致
export const CATEGORY_TAB_LABEL: Record<CategoryType, string> = {
  [CATEGORY_TYPE.POST]: "文章分類",
  [CATEGORY_TYPE.PROJECT]: "專案分類",
}

export const CATEGORY_CONTENT_UNIT: Record<CategoryType, string> = {
  [CATEGORY_TYPE.POST]: "篇文章",
  [CATEGORY_TYPE.PROJECT]: "個作品",
}

// 圖表中的數量單位，例如「12 篇」、「3 個」
export const CATEGORY_COUNT_UNIT: Record<CategoryType, string> = {
  [CATEGORY_TYPE.POST]: "篇",
  [CATEGORY_TYPE.PROJECT]: "個",
}

export const CATEGORY_CONTENT_NOUN: Record<CategoryType, string> = {
  [CATEGORY_TYPE.POST]: "文章",
  [CATEGORY_TYPE.PROJECT]: "作品",
}

// 例如「已有 4 篇文章」、「尚無作品」
export function formatCategoryContentCount(type: CategoryType, count: number) {
  return count > 0
    ? `已有 ${count} ${CATEGORY_CONTENT_UNIT[type]}`
    : `尚無${CATEGORY_CONTENT_NOUN[type]}`
}

// 內容區塊的網址是 /{代稱}，不可與固定路由撞名；資料庫 sections.slug 的 check constraint 擋下前三個，
// 之後新增的固定路由（歸檔、草稿預覽）由伺服器端驗證擋下
export const RESERVED_SECTION_SLUGS = ["admin", "api", "projects", "archives", "preview"] as const

export function isReservedSectionSlug(slug: string) {
  return (RESERVED_SECTION_SLUGS as readonly string[]).includes(slug)
}
