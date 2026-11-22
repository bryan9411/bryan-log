import { RADAR_MODULE, SECURITY_TAB, type SecurityTab } from "@/config/radar"

// 首頁各區塊顯示的資料筆數
export const HOME_LATEST_POSTS_LIMIT = 5
export const HOME_FEATURED_PROJECTS_LIMIT = 6

// 首頁「技術週榜精選」：依序取各榜單前幾名，模組未公開時自動略過；資安情資需指定榜單
export type HomeRadarPick =
  | { module: typeof RADAR_MODULE.GITHUB; limit: number }
  | { module: typeof RADAR_MODULE.HN; limit: number }
  | { module: typeof RADAR_MODULE.SECURITY; list: SecurityTab; limit: number }

// 卡片總數建議不超過 4 張，避免首頁過長
export const HOME_RADAR_PICKS = [
  { module: RADAR_MODULE.GITHUB, limit: 3 },
  { module: RADAR_MODULE.SECURITY, list: SECURITY_TAB.KEV, limit: 1 },
] as const satisfies readonly HomeRadarPick[]
