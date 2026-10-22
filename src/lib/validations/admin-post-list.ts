import { z } from "zod"

import { CONTENT_STATUS } from "@/lib/constants/content"

// 後台文章列表的網址查詢參數：/admin/posts?q=react&status=draft&page=2
export const ADMIN_POST_LIST_PARAM = {
  QUERY: "q",
  STATUS: "status",
  PAGE: "page",
} as const

export const ADMIN_POSTS_PAGE_SIZE = 10

export const SEARCH_QUERY_MAX_LENGTH = 100

// 刪除表單中文章識別碼的欄位名稱，單篇與批次刪除共用（可重複出現）
export const DELETE_POSTS_FIELD = "ids"

export const POST_STATUS_FILTER = {
  ALL: "all",
  PUBLISHED: CONTENT_STATUS.PUBLISHED,
  DRAFT: CONTENT_STATUS.DRAFT,
} as const

export const postStatusFilterSchema = z.enum([
  POST_STATUS_FILTER.ALL,
  POST_STATUS_FILTER.PUBLISHED,
  POST_STATUS_FILTER.DRAFT,
])

export type PostStatusFilter = z.infer<typeof postStatusFilterSchema>

export const POST_STATUS_FILTER_LABEL: Record<PostStatusFilter, string> = {
  [POST_STATUS_FILTER.ALL]: "全部",
  [POST_STATUS_FILTER.PUBLISHED]: "已發布",
  [POST_STATUS_FILTER.DRAFT]: "草稿",
}

export type AdminPostListParams = {
  query: string
  status: PostStatusFilter
  page: number
}

// 網址參數可能被手動竄改，任何不合法的值都退回預設，而不是讓頁面報錯
const adminPostListParamsSchema = z.object({
  query: z
    .string()
    .trim()
    .transform((value) => value.slice(0, SEARCH_QUERY_MAX_LENGTH))
    .catch(""),
  status: postStatusFilterSchema.catch(POST_STATUS_FILTER.ALL),
  page: z.coerce.number().int().min(1).catch(1),
})

type RawSearchParams = Record<string, string | string[] | undefined>

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

export function parseAdminPostListParams(searchParams: RawSearchParams): AdminPostListParams {
  return adminPostListParamsSchema.parse({
    query: firstValue(searchParams[ADMIN_POST_LIST_PARAM.QUERY]) ?? "",
    status: firstValue(searchParams[ADMIN_POST_LIST_PARAM.STATUS]),
    page: firstValue(searchParams[ADMIN_POST_LIST_PARAM.PAGE]),
  })
}

// 只輸出非預設值，讓網址保持精簡，例如第一頁的「全部」狀態直接是 /admin/posts
export function buildAdminPostListQuery({ query, status, page }: AdminPostListParams) {
  const params = new URLSearchParams()

  if (query) params.set(ADMIN_POST_LIST_PARAM.QUERY, query)
  if (status !== POST_STATUS_FILTER.ALL) params.set(ADMIN_POST_LIST_PARAM.STATUS, status)
  if (page > 1) params.set(ADMIN_POST_LIST_PARAM.PAGE, String(page))

  return params.toString()
}

export function hasActivePostFilters({ query, status }: AdminPostListParams) {
  return query !== "" || status !== POST_STATUS_FILTER.ALL
}
