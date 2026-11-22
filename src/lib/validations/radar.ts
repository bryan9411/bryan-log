import { z } from "zod"

import { RADAR_MODULE_KEYS, RADAR_VISIBILITY } from "@/config/radar"

export const radarModuleKeySchema = z.enum(RADAR_MODULE_KEYS, { error: "未知的雷達模組" })

export const radarVisibilitySchema = z.enum([RADAR_VISIBILITY.HIDDEN, RADAR_VISIBILITY.PUBLIC], {
  error: "未知的公開狀態",
})

export const radarModuleVisibilitySchema = z.object({
  key: radarModuleKeySchema,
  visibility: radarVisibilitySchema,
})

export const radarItemBlockedSchema = z.object({
  id: z.uuid({ error: "項目編號格式錯誤" }),
  blocked: z.boolean({ error: "隱藏狀態格式錯誤" }),
})

export const RADAR_SYNC_FIELD = "key"
