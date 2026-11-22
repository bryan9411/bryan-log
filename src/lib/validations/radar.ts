import { z } from "zod"

import {
  RADAR_KEYWORD_LENGTH,
  RADAR_KEYWORD_RULE_KIND,
  RADAR_MODULE_KEYS,
  RADAR_VISIBILITY,
} from "@/config/radar"
import { normalizeKeyword } from "@/lib/radar/keywords"

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

export const radarKeywordSchema = z
  .string({ error: "請輸入關鍵字" })
  .transform(normalizeKeyword)
  .pipe(
    z
      .string()
      .min(RADAR_KEYWORD_LENGTH.MIN, `關鍵字至少需要 ${RADAR_KEYWORD_LENGTH.MIN} 個字元`)
      .max(RADAR_KEYWORD_LENGTH.MAX, `關鍵字最多 ${RADAR_KEYWORD_LENGTH.MAX} 個字元`),
  )

export const radarKeywordRuleKindSchema = z.enum(
  [RADAR_KEYWORD_RULE_KIND.EXCLUDE, RADAR_KEYWORD_RULE_KIND.WATCH],
  { error: "未知的規則類型" },
)

export const radarKeywordRuleSchema = z.object({
  moduleKey: radarModuleKeySchema,
  kind: radarKeywordRuleKindSchema,
  keyword: radarKeywordSchema,
})

export const radarKeywordPreviewSchema = z.object({
  moduleKey: radarModuleKeySchema,
  keyword: radarKeywordSchema,
})

export const radarKeywordRuleIdSchema = z.uuid({ error: "規則編號格式錯誤" })
