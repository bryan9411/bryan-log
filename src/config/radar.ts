import type { Route } from "next"

import { ROUTES } from "@/config/routes"

// 雷達模組 key 與資料庫 radar_modules.key 一致；新增模組時在此註冊，並在 lib/radar/sync.ts 加上同步函式
export const RADAR_MODULE = {
  GITHUB: "github",
  HN: "hn",
} as const

export type RadarModuleKey = (typeof RADAR_MODULE)[keyof typeof RADAR_MODULE]

export const RADAR_MODULE_KEYS = [RADAR_MODULE.GITHUB, RADAR_MODULE.HN] as const

// 與資料庫 enum `radar_visibility` 一致：hidden 只有管理員看得到，public 對訪客公開
export const RADAR_VISIBILITY = {
  HIDDEN: "hidden",
  PUBLIC: "public",
} as const

export type RadarVisibility = (typeof RADAR_VISIBILITY)[keyof typeof RADAR_VISIBILITY]

export const RADAR_VISIBILITY_LABEL: Record<RadarVisibility, string> = {
  [RADAR_VISIBILITY.HIDDEN]: "僅自己可見",
  [RADAR_VISIBILITY.PUBLIC]: "公開",
}

type RadarModuleMeta = {
  // 資料庫的 name 是後台顯示用；導覽列與頁面標題以這裡的文字為準，避免訪客看到未整理的名稱
  label: string
  description: string
  publicPath: Route
  adminPath: Route
}

export const RADAR_MODULE_META: Record<RadarModuleKey, RadarModuleMeta> = {
  [RADAR_MODULE.GITHUB]: {
    label: "GitHub 週榜",
    description: "近 7 天新增 star 數最多的開源專案，可依分類篩選。",
    publicPath: ROUTES.RADAR_GITHUB,
    adminPath: ROUTES.ADMIN_RADAR_GITHUB,
  },
  [RADAR_MODULE.HN]: {
    label: "Hacker News 週榜",
    description: "近 7 天 Hacker News 上分數最高的討論與 Show HN 作品。",
    publicPath: ROUTES.RADAR_HN,
    adminPath: ROUTES.ADMIN_RADAR_HN,
  },
}

export const RADAR_OVERVIEW_DESCRIPTION =
  "每天自動同步的技術情報榜單：本週最受關注的開源專案與 Hacker News 熱門討論，排名依據完全公開。"

export function isRadarModuleKey(value: string): value is RadarModuleKey {
  return (RADAR_MODULE_KEYS as readonly string[]).includes(value)
}

// 前台榜單顯示的名次數；RPC 多回傳幾筆候選，切換分類或隱藏項目後仍能遞補滿
export const RADAR_RANKING_SIZE = 20
// 前台 RPC 上限為 50；切換分類後仍能遞補，也能涵蓋被隱藏的項目
export const RADAR_CANDIDATE_LIMIT = 50
export const RADAR_OVERVIEW_SIZE = 5

// 統計期間（天）；快照未滿這個天數時，前台顯示「資料累積中」
export const RADAR_WINDOW_DAYS = 7

// Vercel Cron 失敗不會通知，超過這個時數沒有成功同步就在後台顯示警示
export const RADAR_STALE_HOURS = 36

// -----------------------------------------------------------------------------
// GitHub 週榜
// -----------------------------------------------------------------------------

export const GITHUB_CATEGORY = {
  AI: "ai",
  FRONTEND: "frontend",
} as const

export type GithubCategory = (typeof GITHUB_CATEGORY)[keyof typeof GITHUB_CATEGORY]

type CategoryRule = {
  label: string
  // 每天以這些 topic 搜尋候選 repo
  searchTopics: string[]
  // repo 的 topics 含有任一個即歸入此分類
  topics: string[]
  // 名稱或描述以「整個單字」比對（不分大小寫），例如 agent 不會比對到 reagent
  keywords: string[]
}

// 分類只用來篩選，不影響名次；一個 repo 可以同時屬於多個分類
export const GITHUB_CATEGORY_RULES: Record<GithubCategory, CategoryRule> = {
  [GITHUB_CATEGORY.AI]: {
    label: "AI 工具 & Agent",
    searchTopics: ["llm", "ai-agents", "mcp", "generative-ai", "rag"],
    topics: [
      "ai",
      "llm",
      "llms",
      "ai-agent",
      "ai-agents",
      "agents",
      "agentic-ai",
      "mcp",
      "mcp-server",
      "model-context-protocol",
      "generative-ai",
      "genai",
      "rag",
      "openai",
      "chatgpt",
      "claude",
      "anthropic",
      "gemini",
      "ollama",
      "langchain",
      "llmops",
      "machine-learning",
      "deep-learning",
    ],
    keywords: [
      "ai",
      "llm",
      "llms",
      "agent",
      "agents",
      "agentic",
      "mcp",
      "gpt",
      "rag",
      "claude",
      "copilot",
      "openai",
      "gemini",
      "ollama",
      "chatbot",
      "prompt",
      "prompts",
    ],
  },
  [GITHUB_CATEGORY.FRONTEND]: {
    label: "前端與全端",
    searchTopics: ["react", "nextjs", "typescript", "frontend", "tailwindcss", "vue", "svelte"],
    topics: [
      "react",
      "reactjs",
      "nextjs",
      "vue",
      "vuejs",
      "nuxt",
      "svelte",
      "sveltekit",
      "angular",
      "solidjs",
      "astro",
      "remix",
      "frontend",
      "fullstack",
      "full-stack",
      "typescript",
      "javascript",
      "nodejs",
      "bun",
      "deno",
      "vite",
      "tailwindcss",
      "css",
      "ui-components",
      "design-system",
      "web",
      "webdev",
    ],
    keywords: [
      "react",
      "next.js",
      "nextjs",
      "vue",
      "nuxt",
      "svelte",
      "angular",
      "frontend",
      "front-end",
      "fullstack",
      "full-stack",
      "typescript",
      "javascript",
      "node.js",
      "tailwind",
      "css",
      "vite",
    ],
  },
}

export const GITHUB_CATEGORIES = Object.keys(GITHUB_CATEGORY_RULES) as GithubCategory[]

// awesome-list 類清單不列入排名（star 多但不是可用的專案）
export const GITHUB_LIST_TOPICS = ["awesome", "awesome-list", "awesome-lists", "curated-list"]
export const GITHUB_LIST_PATTERNS = [/^awesome[-_.]/i, /[-_.]awesome$/i, /\bcurated list\b/i]

// 候選池門檻：上線兩週後依實際榜單調整
export const GITHUB_POOL = {
  // 新秀：近 N 天建立、star 達門檻，依 star 排序取前 N 個
  NEWCOMER_CREATED_DAYS: 30,
  NEWCOMER_MIN_STARS: 50,
  NEWCOMER_LIMIT: 200,
  // 主題：近 N 天有推送、star 達門檻，每個 topic 取前 N 個
  TOPIC_PUSHED_DAYS: 30,
  TOPIC_MIN_STARS: 300,
  TOPIC_LIMIT: 100,
  // 連續 N 天沒被搜尋命中、且 7 日增量低於門檻的 repo 移出候選池
  PRUNE_AFTER_DAYS: 30,
  PRUNE_MAX_DELTA: 10,
  // 快照保留天數（日後要做月榜不必改結構）
  SNAPSHOT_RETENTION_DAYS: 35,
} as const

// npm 下載量只查每天前 N 名；套件名稱查不到時隔 N 天再試
export const GITHUB_NPM = {
  TOP_N: 30,
  RECHECK_DAYS: 30,
} as const

// -----------------------------------------------------------------------------
// Hacker News 週榜
// -----------------------------------------------------------------------------

export const HN_TAB = {
  TOP: "top",
  SHOW: "show",
} as const

export type HnTab = (typeof HN_TAB)[keyof typeof HN_TAB]

export const HN_TAB_LABEL: Record<HnTab, string> = {
  [HN_TAB.TOP]: "熱門討論",
  [HN_TAB.SHOW]: "Show HN",
}

export const HN_SYNC = {
  // 熱門討論只收分數超過門檻的 story；Show HN 分數普遍較低，門檻另訂
  STORY_MIN_POINTS: 20,
  SHOW_HN_MIN_POINTS: 5,
  HITS_PER_PAGE: 200,
  // 分數會持續變動，每天重抓一次；超過保留天數的項目刪除
  RETENTION_DAYS: 14,
} as const
