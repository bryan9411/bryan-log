import { z } from "zod"

export const radarCollectItemIdSchema = z.uuid({ error: "項目編號格式錯誤" })
