import { z } from "zod"

import { isTrackedPath } from "@/lib/analytics/tracked-paths"
import {
  WEB_VITAL_MAX_VALUE,
  WEB_VITAL_PATH_MAX_LENGTH,
  WEB_VITALS_BATCH_LIMIT,
  webVitalDeviceSchema,
  webVitalMetricSchema,
} from "@/lib/constants/web-vitals"

// 只接受站內路徑，不含查詢字串與錨點，避免把個人化參數寫進資料庫
const PATH_PATTERN = /^\/[^\s?#]*$/

export const webVitalEntrySchema = z.object({
  metric: webVitalMetricSchema,
  value: z.number().finite().min(0).max(WEB_VITAL_MAX_VALUE),
  path: z
    .string()
    .max(WEB_VITAL_PATH_MAX_LENGTH)
    .regex(PATH_PATTERN)
    // 去除結尾斜線（根路徑除外），同一頁面不會因寫法不同被拆成兩筆
    .transform((path) => (path.length > 1 ? path.replace(/\/+$/, "") : path))
    .refine(isTrackedPath),
  device: webVitalDeviceSchema,
})

export type WebVitalEntry = z.input<typeof webVitalEntrySchema>

export const webVitalsPayloadSchema = z.object({
  entries: z.array(webVitalEntrySchema).min(1).max(WEB_VITALS_BATCH_LIMIT),
})

export type WebVitalsPayload = z.input<typeof webVitalsPayloadSchema>
