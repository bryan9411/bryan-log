import {
  SECURITY_ADVISORY,
  SECURITY_ECOSYSTEM_LABEL,
  SECURITY_KEV,
  SECURITY_RANKING_SIZE,
} from "@/config/radar"
import { formatInteger } from "@/lib/format"

// 前台照實寫出統計方式；數字一律取自 config/radar.ts，調整門檻時文字會跟著更新

export const KEV_SUMMARY = `近 ${SECURITY_KEV.WINDOW_DAYS} 天被 CISA 確認遭實際攻擊的漏洞，勒索軟體利用者優先，再依 EPSS 遭利用機率排序。`

export const ADVISORY_SUMMARY = `近 ${SECURITY_ADVISORY.WINDOW_DAYS} 天發布的高風險套件漏洞與熱門套件投毒事件，依嚴重度、遭利用機率與套件下載量排序。`

export const KEV_PERIOD = `近 ${SECURITY_KEV.WINDOW_DAYS} 天加入 KEV（台灣日期）`

export const ADVISORY_PERIOD = `近 ${SECURITY_ADVISORY.WINDOW_DAYS} 天發布（自最後同步時間起算）`

const ecosystems = SECURITY_ADVISORY.ECOSYSTEMS.map(
  (ecosystem) => SECURITY_ECOSYSTEM_LABEL[ecosystem] ?? ecosystem,
).join("、")

export const KEV_RANKING_BASIS = [
  "資料來源：美國 CISA 的 Known Exploited Vulnerabilities（KEV）目錄，只收錄已確認在真實攻擊中被利用的漏洞，每天重新讀取整份目錄。",
  "排序：1. 已知被勒索軟體利用者優先；2. EPSS 機率由高到低；3. 加入 KEV 的日期由新到舊。",
  "EPSS 是 FIRST.org 每日更新的「未來 30 天遭利用機率」。剛公開的漏洞累積的資料少，分數常常偏低，因此排序不單看 EPSS。",
  "KEV 以企業產品為主（網路設備、VPN、作業系統），開發者套件的漏洞請看「開發生態漏洞」。",
  "CVSS 分數來自 NVD，NVD 尚未分析的漏洞不顯示。",
  `名次完全依數據排列，不做人工加權；不適合的項目會被隱藏，後面的名次自動遞補，維持 ${SECURITY_RANKING_SIZE} 名。`,
]

export const ADVISORY_RANKING_BASIS = [
  `資料來源：GitHub Advisory Database，涵蓋 ${ecosystems}。`,
  "收錄範圍：GitHub 已審核、等級為 Critical 或 High 的公告，以及 npm 惡意套件公告。",
  `惡意套件只收錄 npm 週下載量 ≥ ${formatInteger(SECURITY_ADVISORY.MALWARE_MIN_WEEKLY_DOWNLOADS)} 的套件：能抓到熱門套件被入侵投毒的事件，同時濾掉每週數百個零下載的仿冒套件。`,
  "排序：1. 等級（惡意套件與 Critical 同級，高於 High）；2. EPSS 機率由高到低（沒有 CVE 的視為 0）；3. 受影響套件的 npm 週下載量（非 npm 生態系視為 0）；4. 發布時間由新到舊。",
  "同一個 CVE 也出現在 CISA KEV 時，標示「已遭實際利用」。",
  `名次完全依數據排列，不做人工加權；不適合的項目會被隱藏，後面的名次自動遞補，維持 ${SECURITY_RANKING_SIZE} 名。`,
]
