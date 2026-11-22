import { z } from "zod"

import {
  RADAR_COLLECTION_STATUS,
  RADAR_MODULE_KEYS,
  type RadarCollectionStatus,
  type RadarModuleKey,
} from "@/config/radar"

export const radarCollectItemIdSchema = z.uuid({ error: "項目編號格式錯誤" })

export const radarCollectionIdSchema = z.uuid({ error: "收藏編號格式錯誤" })

// 與資料表的 check 限制一致
export const RADAR_COLLECTION_NOTE_MAX_LENGTH = 20_000
export const RADAR_COLLECTION_TAGS_MAX = 10
export const RADAR_COLLECTION_TAG_MAX_LENGTH = 30

export const RADAR_COLLECTION_STATUSES = [
  RADAR_COLLECTION_STATUS.TO_RESEARCH,
  RADAR_COLLECTION_STATUS.EVALUATING,
  RADAR_COLLECTION_STATUS.ADOPTED,
  RADAR_COLLECTION_STATUS.ARCHIVED,
] as const satisfies readonly RadarCollectionStatus[]

export const radarCollectionStatusSchema = z.enum(RADAR_COLLECTION_STATUSES, {
  error: "研究狀態不正確",
})

const tagSchema = z
  .string()
  .trim()
  .min(1, { error: "標籤不可空白" })
  .max(RADAR_COLLECTION_TAG_MAX_LENGTH, {
    error: `標籤最多 ${RADAR_COLLECTION_TAG_MAX_LENGTH} 個字`,
  })

// 只更新有傳入的欄位：列表只切換狀態，詳細頁一次儲存狀態、筆記與標籤
export const radarCollectionUpdateSchema = z
  .object({
    status: radarCollectionStatusSchema.optional(),
    note: z
      .string()
      .max(RADAR_COLLECTION_NOTE_MAX_LENGTH, {
        error: `筆記最多 ${RADAR_COLLECTION_NOTE_MAX_LENGTH.toLocaleString("en-US")} 字`,
      })
      .optional(),
    tags: z
      .array(tagSchema)
      .max(RADAR_COLLECTION_TAGS_MAX, { error: `標籤最多 ${RADAR_COLLECTION_TAGS_MAX} 個` })
      // 不分大小寫去除重複，保留第一次出現的寫法
      .transform((tags) =>
        tags.filter(
          (tag, index) =>
            tags.findIndex((other) => other.toLowerCase() === tag.toLowerCase()) === index,
        ),
      )
      .optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    error: "沒有要更新的欄位",
  })

export type RadarCollectionUpdate = z.input<typeof radarCollectionUpdateSchema>

// -----------------------------------------------------------------------------
// 收藏列表的網址查詢參數：/admin/radar/collections?status=evaluating&module=github&tag=ai&q=agent&page=2
// -----------------------------------------------------------------------------

export const RADAR_COLLECTION_LIST_PARAM = {
  STATUS: "status",
  MODULE: "module",
  TAG: "tag",
  QUERY: "q",
  PAGE: "page",
} as const

export const RADAR_COLLECTIONS_PAGE_SIZE = 20

export const RADAR_COLLECTION_SEARCH_MAX_LENGTH = 100

export const ALL_FILTER = "all"

export type RadarCollectionStatusFilter = typeof ALL_FILTER | RadarCollectionStatus
export type RadarCollectionModuleFilter = typeof ALL_FILTER | RadarModuleKey

export const RADAR_COLLECTION_STATUS_FILTERS: RadarCollectionStatusFilter[] = [
  ALL_FILTER,
  ...RADAR_COLLECTION_STATUSES,
]

export type AdminRadarCollectionListParams = {
  status: RadarCollectionStatusFilter
  module: RadarCollectionModuleFilter
  tag: string
  query: string
  page: number
}

// 網址參數可能被手動竄改，任何不合法的值都退回預設，而不是讓頁面報錯
const listParamsSchema = z.object({
  status: z.enum([ALL_FILTER, ...RADAR_COLLECTION_STATUSES]).catch(ALL_FILTER),
  module: z.enum([ALL_FILTER, ...RADAR_MODULE_KEYS]).catch(ALL_FILTER),
  tag: z
    .string()
    .trim()
    .transform((value) => value.slice(0, RADAR_COLLECTION_TAG_MAX_LENGTH))
    .catch(""),
  query: z
    .string()
    .trim()
    .transform((value) => value.slice(0, RADAR_COLLECTION_SEARCH_MAX_LENGTH))
    .catch(""),
  page: z.coerce.number().int().min(1).catch(1),
})

type RawSearchParams = Record<string, string | string[] | undefined>

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

export function parseRadarCollectionListParams(
  searchParams: RawSearchParams,
): AdminRadarCollectionListParams {
  return listParamsSchema.parse({
    status: firstValue(searchParams[RADAR_COLLECTION_LIST_PARAM.STATUS]),
    module: firstValue(searchParams[RADAR_COLLECTION_LIST_PARAM.MODULE]),
    tag: firstValue(searchParams[RADAR_COLLECTION_LIST_PARAM.TAG]) ?? "",
    query: firstValue(searchParams[RADAR_COLLECTION_LIST_PARAM.QUERY]) ?? "",
    page: firstValue(searchParams[RADAR_COLLECTION_LIST_PARAM.PAGE]),
  })
}

// 只輸出非預設值，讓網址保持精簡，例如第一頁的「全部」直接是 /admin/radar/collections
export function buildRadarCollectionListQuery({
  status,
  module,
  tag,
  query,
  page,
}: AdminRadarCollectionListParams) {
  const params = new URLSearchParams()

  if (status !== ALL_FILTER) params.set(RADAR_COLLECTION_LIST_PARAM.STATUS, status)
  if (module !== ALL_FILTER) params.set(RADAR_COLLECTION_LIST_PARAM.MODULE, module)
  if (tag) params.set(RADAR_COLLECTION_LIST_PARAM.TAG, tag)
  if (query) params.set(RADAR_COLLECTION_LIST_PARAM.QUERY, query)
  if (page > 1) params.set(RADAR_COLLECTION_LIST_PARAM.PAGE, String(page))

  return params.toString()
}

// 狀態分頁不算「篩選」：切到某個狀態沒有結果時，提示的是這個狀態還沒有收藏
export function hasActiveCollectionFilters({ module, tag, query }: AdminRadarCollectionListParams) {
  return module !== ALL_FILTER || tag !== "" || query !== ""
}
