import {
  GITHUB_NPM,
  GITHUB_POOL,
  HN_SYNC,
  RADAR_RANKING_SIZE,
  RADAR_WINDOW_DAYS,
} from "@/config/radar"
import { formatDate } from "@/lib/format"

// 前台照實寫出統計方式，讓讀者能自行驗證；數字一律取自 config/radar.ts，調整門檻時文字會跟著更新
export const GITHUB_RANKING_BASIS = [
  `排名指標：近 ${RADAR_WINDOW_DAYS} 天新增 star 數（最新快照 − ${RADAR_WINDOW_DAYS} 天前快照），每天同步一次。`,
  `候選池：近 ${GITHUB_POOL.NEWCOMER_CREATED_DAYS} 天建立且 star ≥ ${GITHUB_POOL.NEWCOMER_MIN_STARS} 的新專案，以及 AI、前端相關 topic 中近 ${GITHUB_POOL.TOPIC_PUSHED_DAYS} 天有推送且 star ≥ ${GITHUB_POOL.TOPIC_MIN_STARS} 的專案。`,
  `不列入排名：已封存、fork、${GITHUB_POOL.TOPIC_PUSHED_DAYS} 天內沒有推送，以及 awesome-list 類的清單。`,
  "分類依 topics、名稱與描述的關鍵字判斷，一個專案可以同時屬於多個分類；分類只用來篩選，不影響名次。",
  "名次完全依數據排列，不做人工加權；疑似灌星等不適合的專案會被隱藏，後面的名次自動遞補。",
  `npm 週下載量只為每日前 ${GITHUB_NPM.TOP_N} 名查詢，且套件的 repository 必須指回該專案才會顯示。`,
]

export const HN_RANKING_BASIS = [
  `熱門討論：近 ${RADAR_WINDOW_DAYS} 天發布、分數超過 ${HN_SYNC.STORY_MIN_POINTS} 的 story，依 Hacker News 分數排序。`,
  `Show HN：近 ${RADAR_WINDOW_DAYS} 天發布的 Show HN 貼文，依分數排序。`,
  "資料來自 Hacker News 官方合作的 Algolia 搜尋 API，每天重新抓取一次分數與留言數。",
  "Ask HN 等沒有外部連結的貼文，標題直接連到 Hacker News 討論頁。",
  `名次完全依數據排列，不做人工加權；不適合的項目會被隱藏，後面的名次自動遞補，維持 ${RADAR_RANKING_SIZE} 名。`,
]

const DAY_MS = 24 * 60 * 60 * 1000

// 例如「2026年11月15日 – 2026年11月22日」；沒有資料時只寫統計天數
export function formatGithubPeriod(latestDate: string | null, windowDays: number) {
  if (!latestDate) return `近 ${RADAR_WINDOW_DAYS} 天`
  const end = new Date(`${latestDate}T00:00:00+08:00`)
  // 第一天只有一份快照，統計跨度為 0，只顯示當天
  if (windowDays <= 0) return formatDate(end)
  const start = new Date(end.getTime() - windowDays * DAY_MS)
  return `${formatDate(start)} – ${formatDate(end)}`
}

export const HN_PERIOD = `近 ${RADAR_WINDOW_DAYS} 天（自最後同步時間起算）`

// 快照未滿統計天數時回傳已累積的快照天數（第一天的統計跨度為 0，但已有 1 天快照），前台顯示「資料累積中」
export function getAccumulatingDays(windowDays: number, hasItems: boolean) {
  return hasItems && windowDays < RADAR_WINDOW_DAYS ? windowDays + 1 : null
}
