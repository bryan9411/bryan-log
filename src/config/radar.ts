import type { Route } from "next"

import { ROUTES } from "@/config/routes"

// 雷達模組 key 與資料庫 radar_modules.key 一致；新增模組時在此註冊，並在 lib/radar/sync.ts 加上同步函式
export const RADAR_MODULE = {
  GITHUB: "github",
  HN: "hn",
  SECURITY: "security",
} as const

export type RadarModuleKey = (typeof RADAR_MODULE)[keyof typeof RADAR_MODULE]

export const RADAR_MODULE_KEYS = [
  RADAR_MODULE.GITHUB,
  RADAR_MODULE.HN,
  RADAR_MODULE.SECURITY,
] as const

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
  [RADAR_MODULE.SECURITY]: {
    label: "資安情資",
    description: "近期遭實際攻擊的漏洞，以及開發生態（npm、PyPI、Go…）的高風險漏洞與套件投毒事件。",
    publicPath: ROUTES.RADAR_SECURITY,
    adminPath: ROUTES.ADMIN_RADAR_SECURITY,
  },
}

export const RADAR_OVERVIEW_DESCRIPTION =
  "每天自動同步的技術情報榜單：本週最受關注的開源專案、Hacker News 熱門討論與資安情資，排名依據完全公開。"

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

// -----------------------------------------------------------------------------
// 資安情資（第二期）：兩個榜單共用一個模組 security
// -----------------------------------------------------------------------------

export const SECURITY_TAB = {
  KEV: "kev",
  ADVISORY: "advisory",
} as const

export type SecurityTab = (typeof SECURITY_TAB)[keyof typeof SECURITY_TAB]

export const SECURITY_TABS: SecurityTab[] = [SECURITY_TAB.KEV, SECURITY_TAB.ADVISORY]

export const SECURITY_TAB_LABEL: Record<SecurityTab, string> = {
  [SECURITY_TAB.KEV]: "實戰遭利用",
  [SECURITY_TAB.ADVISORY]: "開發生態漏洞",
}

// 前台各榜單顯示的名次數；總覽頁每個榜單取前 N 名
export const SECURITY_RANKING_SIZE = 10
export const SECURITY_OVERVIEW_SIZE = 3
// 後台顯示到第 N 名，超過前台名次的部分以淡色顯示為遞補候選
export const SECURITY_ADMIN_RANKING_SIZE = 25

export const SECURITY_KEV = {
  // 榜單統計期間：近 N 天加入 KEV（7 天只有個位數，30 天才湊得滿 Top 10）
  WINDOW_DAYS: 30,
  // 同步與保留：近 N 天加入的項目，超過即刪除
  RETENTION_DAYS: 60,
  // FIRST EPSS API 一次最多查 100 個 CVE
  EPSS_BATCH_SIZE: 100,
} as const

export const SECURITY_ADVISORY = {
  // 榜單統計期間：近 N 天發布
  WINDOW_DAYS: 7,
  // 發布超過 N 天的項目刪除
  RETENTION_DAYS: 30,
  // GitHub Advisory API 的 ecosystem 參數值；每個生態系 × 每個等級各查一次
  ECOSYSTEMS: ["npm", "pip", "go", "actions", "rust"],
  // severity 參數一次只能帶一個值，帶 critical,high 會回 422
  SEVERITIES: ["critical", "high"],
  // 惡意套件只收 npm 週下載量達門檻的套件，濾掉大量零下載的仿冒套件
  MALWARE_MIN_WEEKLY_DOWNLOADS: 1_000,
  // 套件下載量查詢結果沿用 N 天：每天只需要查新增的惡意套件公告（約 70 筆）與查詢失敗的套件
  NPM_CACHE_DAYS: 7,
  // 每次同步查 npm 下載量的時間上限；首次上線有 500 多筆惡意套件要查，沒查完的留到下次（或在後台再按一次同步）
  NPM_LOOKUP_BUDGET_MS: 120_000,
} as const

// 生態系在前台顯示的名稱（GitHub API 的值 → 一般熟悉的名稱）
export const SECURITY_ECOSYSTEM_LABEL: Record<string, string> = {
  npm: "npm",
  pip: "PyPI",
  go: "Go",
  actions: "GitHub Actions",
  rust: "crates.io",
}

export const SECURITY_SEVERITY_LABEL: Record<string, string> = {
  malware: "惡意套件",
  critical: "Critical",
  high: "High",
}

// NVD 只用來補 CVSS 分數（選用）；無 key 每 30 秒 5 次、有 key 每 30 秒 50 次
export const SECURITY_NVD = {
  MAX_REQUESTS_WITHOUT_KEY: 10,
  MAX_REQUESTS_WITH_KEY: 100,
  DELAY_WITHOUT_KEY_MS: 6_500,
  DELAY_WITH_KEY_MS: 700,
  // NVD 尚未分析的 CVE 查不到分數，隔 N 天再查
  RECHECK_DAYS: 2,
} as const

export const SECURITY_TOPIC = {
  AI: "ai",
  WEB: "web",
  INFRA: "infra",
} as const

export type SecurityTopic = (typeof SECURITY_TOPIC)[keyof typeof SECURITY_TOPIC]

type SecurityTopicRule = {
  label: string
  // 套件名稱、廠商／產品、標題與摘要以「整個單字」比對（不分大小寫）
  keywords: string[]
  // 套件名稱完全相符；結尾為 / 時代表 scope 前綴，例如 @langchain/ 會命中 @langchain/core
  packages: string[]
  cwes: string[]
  ecosystems: string[]
  // 公告類型（malware 一律歸入供應鏈）
  advisoryTypes: string[]
}

// 主題只用來篩選，不影響名次；一筆漏洞可以同時屬於多個主題
export const SECURITY_TOPIC_RULES: Record<SecurityTopic, SecurityTopicRule> = {
  [SECURITY_TOPIC.AI]: {
    label: "AI 與 Agent",
    keywords: [
      "ai",
      "llm",
      "llms",
      "langchain",
      "langgraph",
      "langflow",
      "llama",
      "llamaindex",
      "llama-index",
      "llama.cpp",
      "openai",
      "anthropic",
      "claude",
      "gemini",
      "chatgpt",
      "copilot",
      "mcp",
      "model context protocol",
      "prompt",
      "prompt injection",
      "transformers",
      "huggingface",
      "hugging face",
      "vllm",
      "ollama",
      "gradio",
      "comfyui",
      "open-webui",
      "open webui",
      "litellm",
      "mlflow",
      "pytorch",
      "tensorflow",
      "agent",
      "agents",
      "agentic",
      "autogen",
      "crewai",
      "rag",
    ],
    packages: ["@langchain/", "@modelcontextprotocol/", "@anthropic-ai/", "@huggingface/"],
    cwes: [],
    ecosystems: [],
    advisoryTypes: [],
  },
  [SECURITY_TOPIC.WEB]: {
    label: "Web 與全端",
    keywords: [
      "next.js",
      "nextjs",
      "react",
      "react-dom",
      "vue",
      "vue.js",
      "nuxt",
      "svelte",
      "sveltekit",
      "angular",
      "astro",
      "remix",
      "express",
      "fastify",
      "koa",
      "nestjs",
      "django",
      "flask",
      "fastapi",
      "laravel",
      "symfony",
      "rails",
      "ruby on rails",
      "wordpress",
      "drupal",
      "joomla",
      "strapi",
      "vite",
      "webpack",
      "axios",
      "jquery",
      "tomcat",
      "nginx",
      "apache http server",
    ],
    packages: ["next", "@next/", "react", "vue", "@vue/", "express", "@nestjs/", "@sveltejs/"],
    cwes: ["CWE-79", "CWE-352", "CWE-1321", "CWE-601", "CWE-444"],
    ecosystems: [],
    advisoryTypes: [],
  },
  [SECURITY_TOPIC.INFRA]: {
    label: "基礎設施與供應鏈",
    keywords: [
      "github actions",
      "docker",
      "kubernetes",
      "k8s",
      "helm",
      "containerd",
      "jenkins",
      "gitlab",
      "terraform",
      "ansible",
      "vpn",
      "firewall",
      "gateway",
      "router",
      "load balancer",
      "fortinet",
      "fortios",
      "fortigate",
      "ivanti",
      "citrix",
      "netscaler",
      "palo alto",
      "pan-os",
      "sonicwall",
      "juniper",
      "big-ip",
      "zyxel",
      "d-link",
      "vmware",
      "esxi",
      "vcenter",
      "openssh",
      "supply chain",
    ],
    packages: [],
    cwes: ["CWE-506"],
    ecosystems: ["actions"],
    advisoryTypes: ["malware"],
  },
}

export const SECURITY_TOPICS = Object.keys(SECURITY_TOPIC_RULES) as SecurityTopic[]

// 關鍵字規則（後台自訂）：exclude 命中即自動隱藏；watch 只加上「關注」徽章，不影響名次
export const RADAR_KEYWORD_RULE_KIND = {
  EXCLUDE: "exclude",
  WATCH: "watch",
} as const

export type RadarKeywordRuleKind =
  (typeof RADAR_KEYWORD_RULE_KIND)[keyof typeof RADAR_KEYWORD_RULE_KIND]

export const RADAR_KEYWORD_RULE_KIND_LABEL: Record<RadarKeywordRuleKind, string> = {
  [RADAR_KEYWORD_RULE_KIND.EXCLUDE]: "排除關鍵字",
  [RADAR_KEYWORD_RULE_KIND.WATCH]: "關注關鍵字",
}

export const RADAR_KEYWORD_LENGTH = { MIN: 2, MAX: 60 } as const
