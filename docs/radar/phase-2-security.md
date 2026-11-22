# 第二期：資安情資中心

> 範圍：「實戰遭利用」榜（CISA KEV + EPSS）、「開發生態漏洞」榜（GitHub Advisory）、主題篩選、CWE 中文標籤、排除／關注關鍵字、防護資源清單
> 不在本期：AI 白話說明與防護指南（已移除）、依賴漏洞比對（見 [backlog.md](backlog.md)）
> 依賴：[第一期](phase-1-github-hn.md)的排程、`radar_items`、後台模組框架與隱藏／遞補機制

---

## 一、目標與驗收條件

| #   | 驗收條件                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------- |
| 1   | `/radar/security` 有兩個分頁：「實戰遭利用」與「開發生態漏洞」，各顯示 Top 10，標示統計依據、期間與最後同步時間 |
| 2   | 兩個分頁都能用主題篩選：全部／AI 與 Agent／Web 與全端／基礎設施與供應鏈                                         |
| 3   | 每筆漏洞顯示 CWE 中文類型標籤（對照表沒有的顯示原始 CWE 編號）                                                  |
| 4   | 「開發生態漏洞」只收錄有一定下載量的惡意套件，不會被大量仿冒套件洗版                                            |
| 5   | 同時出現在 KEV 的 GitHub Advisory 會標示「已遭實際利用」                                                        |
| 6   | 後台可新增「排除關鍵字」（自動隱藏）與「關注關鍵字」（加上徽章，不影響名次）                                    |
| 7   | 頁面底部有防護資源清單，以及 NVD、FIRST、GitHub Advisory Database 要求的來源標示                                |
| 8   | 資安同步獨立排程，失敗不影響第一期的 GitHub／HN 同步                                                            |
| 9   | `pnpm typecheck`、`pnpm lint`、`pnpm build` 全數通過                                                            |

---

## 二、實際資料量（2026-11-22 查詢）

規劃前先查了真實資料，這些數字決定了下面的統計期間與過濾規則：

| 資料                                   | 數量                                  | 影響                                                          |
| -------------------------------------- | ------------------------------------- | ------------------------------------------------------------- |
| KEV 每月新增                           | 2026 年每月 17～43 筆，近 30 天 36 筆 | 「實戰遭利用」用 **30 天**窗口才湊得滿 Top 10；7 天只有個位數 |
| GitHub Advisory 近 7 天 npm（已審核）  | critical 2 筆、high 17 筆             | 7 天窗口足夠                                                  |
| GitHub Advisory 近 7 天 PyPI（已審核） | critical 4 筆、high 34 筆             | 同上                                                          |
| GitHub Advisory 近 7 天 npm 惡意套件   | **超過 500 筆**                       | 絕大多數是零下載的仿冒套件，必須用下載量過濾                  |

---

## 三、排名依據（前台會照實標示）

### A. 實戰遭利用（CISA KEV）

KEV 收錄的是美國 CISA 確認「已在真實攻擊中被利用」的漏洞，等於官方整理好的攻擊事件清單。

- **統計期間**：近 30 天加入 KEV 的漏洞（`dateAdded`）
- **排序**：
  1. 已知被勒索軟體利用（`knownRansomwareCampaignUse = "Known"`）優先
  2. EPSS 機率由高到低（未來 30 天遭利用的機率，FIRST.org 每日更新）
  3. 加入 KEV 的日期由新到舊
- **前台說明文字**：「近 30 天被 CISA 確認遭實際攻擊的漏洞，勒索軟體利用者優先，再依 EPSS 遭利用機率排序。」
- **注意**：KEV 以企業產品為主（網路設備、VPN、作業系統），開發者套件很少，所以需要 B 榜補足。

### B. 開發生態漏洞（GitHub Advisory）

- **統計期間**：近 7 天發布（`published`）
- **收錄範圍**：
  - 已審核公告（`type=reviewed`），等級為 critical 或 high
  - 惡意套件公告（`type=malware`），**只收錄 npm 週下載量 ≥ 1,000 的套件**（門檻寫在設定檔）。這能抓到熱門套件被入侵投毒的事件，濾掉仿冒套件
- **生態系**：npm、pip、go、actions、rust（寫在設定檔，可增減）
- **排序**：
  1. 等級：惡意套件 = critical > high
  2. EPSS 機率由高到低（GitHub Advisory API 直接提供 `epss.percentage`，沒有 CVE 的視為 0）
  3. 受影響套件的 npm 週下載量由高到低（非 npm 生態系視為 0）
  4. 發布時間由新到舊
- **前台說明文字**：「近 7 天發布的高風險套件漏洞與熱門套件投毒事件，依嚴重度、遭利用機率與套件下載量排序。」

### 主題篩選（兩個分頁共用）

| 主題             | 比對來源                           | 關鍵字範例（完整清單寫在 `config/radar.ts`）                                                                                      |
| ---------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| AI 與 Agent      | 套件名稱、廠商／產品、摘要         | llm、langchain、llama、openai、anthropic、mcp、model context protocol、prompt、transformers、vllm、ollama、gradio、comfyui、agent |
| Web 與全端       | 套件名稱、廠商／產品、摘要、CWE    | next、react、vue、express、django、laravel、wordpress、CWE-79、CWE-352、CWE-1321                                                  |
| 基礎設施與供應鏈 | 生態系、廠商／產品、摘要、公告類型 | actions、docker、kubernetes、jenkins、vpn、firewall、gateway、惡意套件公告一律歸入此類                                            |

一筆漏洞可以同時屬於多個主題。分類沿用第一期的 `categorize.ts` 純函式。

---

## 四、資料來源與同步

### 資料來源

| 來源                | 端點                                                                                  | 認證與限制                                  | 用途                   |
| ------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------- |
| CISA KEV            | `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json` | 免認證，單一 JSON 檔（約 1,800 筆）         | A 榜主資料             |
| FIRST EPSS          | `https://api.first.org/data/v1/epss?cve=...`                                          | 免認證，一次最多 100 個 CVE                 | A 榜排序               |
| NVD API 2.0（選用） | `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=...`                          | 無 key 每 30 秒 5 次，有 key 每 30 秒 50 次 | A 榜顯示 CVSS 分數     |
| GitHub Advisory     | `GET https://api.github.com/advisories`                                               | 用第一期的 `GITHUB_TOKEN`                   | B 榜主資料             |
| npm downloads       | `https://api.npmjs.org/downloads/point/last-week/{pkg}`                               | 免認證；非 scoped 套件可一次查多個          | B 榜排序、惡意套件過濾 |

KEV 欄位（已對照官方 schema）：`cveID`、`vendorProject`、`product`、`vulnerabilityName`、`dateAdded`、`shortDescription`、`requiredAction`、`dueDate`、`knownRansomwareCampaignUse`、`notes`、`cwes`。

GitHub Advisory 欄位（已實際呼叫確認）：`ghsa_id`、`cve_id`、`html_url`、`summary`、`type`、`severity`、`published_at`、`vulnerabilities[].package`、`vulnerabilities[].vulnerable_version_range`、`vulnerabilities[].first_patched_version`、`cvss_severities`、`cwes`、`epss`。
注意：`severity` 參數一次只能帶一個值，帶 `critical,high` 會回 422，要分開查。

### 同步流程

新增 `src/lib/radar/security/`：

| 檔案                | 工作                                                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kev.ts`            | 下載 KEV JSON，取近 60 天加入的項目 upsert；呼叫 EPSS（一次 100 個）更新分數                                                                      |
| `nvd.ts`            | 只為「還沒有 CVSS」的 CVE 查 NVD。每天新增的 KEV 只有一兩筆，無 key 也不會撞到限制；首次上線補資料時，有 `NVD_API_KEY` 才一次補完，沒有就分幾天補 |
| `advisory.ts`       | 每個生態系 × 每個等級各查一次已審核公告（5 × 2 = 10 次請求），再分頁查 npm 惡意套件                                                               |
| `malware-filter.ts` | 只處理上次同步後新增的惡意套件公告（每天約 70 筆）：非 scoped 套件批次查下載量，scoped 套件限制同時 8 個請求逐一查；查詢結果快取 7 天             |
| `enrich.ts`         | 計算主題分類、CWE 中文標籤、是否出現在 KEV（用 CVE ID 比對）、是否命中排除／關注關鍵字                                                            |

### 排程

`vercel.json` 新增一個獨立的 Cron，避免和第一期共用 300 秒：

```json
{
  "crons": [
    { "path": "/api/cron/radar?module=github,hn", "schedule": "0 18 * * *" },
    { "path": "/api/cron/radar?module=security", "schedule": "30 18 * * *" }
  ]
}
```

免費方案每個 Cron 每天一次、時間有 ±59 分鐘誤差，兩個 Cron 可能同時執行，各自的函式互不影響。

### 保留期限

- KEV 項目：加入日期超過 60 天後刪除
- GitHub Advisory 項目：發布超過 30 天後刪除
- 第三期上線後，已收藏的項目不刪（見[第三期](phase-3-collections.md)）

---

## 五、資料庫設計

遷移檔 `supabase/migrations/2026xxxx_radar_security.sql`。

**模組**：新增一個模組 `security`，兩個榜單共用公開狀態與同步狀態。前台導覽列只多一個「資安情資」項目。

**項目**：沿用 `radar_items`

| 欄位          | KEV                                                                                                                                                                    | GitHub Advisory                                                                                                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `module_key`  | `security`                                                                                                                                                             | `security`                                                                                                                                                                               |
| `external_id` | `kev:CVE-2026-12345`                                                                                                                                                   | `ghsa:GHSA-xxxx-xxxx-xxxx`                                                                                                                                                               |
| `title`       | `vulnerabilityName`                                                                                                                                                    | `summary`                                                                                                                                                                                |
| `url`         | `https://nvd.nist.gov/vuln/detail/{cve}`                                                                                                                               | `html_url`                                                                                                                                                                               |
| `categories`  | 主題分類                                                                                                                                                               | 主題分類                                                                                                                                                                                 |
| `data`        | `source: "kev"`、`cve`、`vendor`、`product`、`date_added`、`due_date`、`ransomware`、`short_description`、`required_action`、`cwes`、`epss`、`epss_percentile`、`cvss` | `source: "advisory"`、`ghsa`、`cve`、`type`、`severity`、`ecosystem`、`package`、`vulnerable_range`、`patched_version`、`cwes`、`epss`、`npm_weekly_downloads`、`in_kev`、`published_at` |

**新表：關鍵字規則**

```sql
create table public.radar_keyword_rules (
  id uuid primary key default gen_random_uuid(),
  module_key text not null references public.radar_modules (key) on delete cascade,
  kind text not null check (kind in ('exclude', 'watch')),
  keyword text not null check (char_length(keyword) between 2 and 60),
  created_at timestamptz not null default now(),
  unique (module_key, kind, keyword)
);
```

- `exclude`：同步時命中就自動設為 `is_blocked`，原因記為「排除關鍵字：xxx」。新增規則時立即套用到現有項目
- `watch`：命中時在 `data.watch_keywords` 記錄命中的關鍵字，前後台顯示「關注」徽章，**不影響名次**
- 規則表結構不綁定資安，第一期的 GitHub／HN 之後也能用

**RPC**

- `get_security_kev_ranking(p_limit int default 25)`
- `get_security_advisory_ranking(p_limit int default 25)`

和第一期一樣是 `security definer`，函式內檢查模組公開、項目未隱藏。

---

## 六、CWE 中文標籤

新增 `src/config/cwe-labels.ts`，靜態對照表，先收常見的 40 個左右，例如：

| CWE      | 中文標籤                 |
| -------- | ------------------------ |
| CWE-79   | XSS 跨站腳本             |
| CWE-89   | SQL 注入                 |
| CWE-78   | 作業系統指令注入         |
| CWE-94   | 程式碼注入               |
| CWE-22   | 路徑穿越                 |
| CWE-287  | 身分驗證不當             |
| CWE-862  | 缺少授權檢查             |
| CWE-918  | SSRF 伺服器端請求偽造    |
| CWE-352  | CSRF 跨站請求偽造        |
| CWE-434  | 危險檔案上傳             |
| CWE-502  | 不安全的反序列化         |
| CWE-787  | 記憶體越界寫入           |
| CWE-416  | 釋放後使用               |
| CWE-1321 | 原型污染                 |
| CWE-1333 | ReDoS 正規表示式阻斷服務 |
| CWE-506  | 內嵌惡意程式碼           |

對照表沒有的直接顯示 `CWE-xxx`，並連到 MITRE 的 CWE 頁面。

---

## 七、前台

### 路由

| 路徑              | 內容                                      |
| ----------------- | ----------------------------------------- |
| `/radar/security` | 資安情資，預設顯示「實戰遭利用」分頁      |
| `/radar`          | 總覽頁新增資安區塊（兩個分頁各取前 3 名） |

導覽列的「雷達」下拉選單新增「資安情資」。

### 卡片內容

**實戰遭利用**

- CVE 編號、廠商／產品、漏洞名稱
- 徽章：勒索軟體利用（有才顯示）、CWE 中文標籤、主題、關注（有才顯示）
- 數據：EPSS 機率與百分位、CVSS 分數（有才顯示）
- 日期：加入 KEV 日期、CISA 修補期限
- 官方說明（`shortDescription`）與建議處置（`requiredAction`），英文原文，預設收合
- 連結：NVD 詳細頁、CISA KEV 目錄

**開發生態漏洞**

- 套件（生態系 / 名稱）、公告標題、GHSA 與 CVE 編號
- 徽章：等級（惡意套件／critical／high）、已遭實際利用（有出現在 KEV 才顯示）、CWE 中文標籤、主題
- 數據：受影響版本範圍、**「升級到 x.y.z」**（有修補版本時特別醒目）、EPSS、npm 週下載量
- 連結：GitHub Advisory 頁面

### 防護資源清單

靜態設定檔 `src/config/security-resources.ts`，顯示在 `/radar/security` 底部。只放標題、一句自己寫的說明和連結，不轉貼原文：

| 分組         | 項目                                                                                                                  |
| ------------ | --------------------------------------------------------------------------------------------------------------------- |
| 指南與標準   | OWASP Top 10、OWASP Top 10 for LLM Applications（OWASP GenAI Security Project）、OWASP ASVS、OWASP Cheat Sheet Series |
| 線上學習     | PortSwigger Web Security Academy、Cloudflare Learning Center                                                          |
| 開源防禦工具 | OSV-Scanner、Trivy、Semgrep、Gitleaks、OWASP ZAP                                                                      |

清單內容上線前再確認一次連結與專案是否仍在維護。

### 來源標示

頁面底部固定顯示：

- CISA Known Exploited Vulnerabilities Catalog
- EPSS 由 FIRST.org 提供（依 FIRST 使用規範標示）
- GitHub Advisory Database（實作時確認授權條款與標示方式）
- 使用 NVD 時加上官方要求的聲明：「This product uses the NVD API but is not endorsed or certified by the NVD.」

### SEO

沿用第一期：先設 `noindex, follow`，不加入 sitemap。

---

## 八、後台

### `/admin/radar/security`

- 分頁：實戰遭利用／開發生態漏洞／已隱藏
- 表格沿用第一期的共用元件，欄位依榜單調整
- 主題篩選、隱藏／還原、立即同步
- 第 11～25 名以淡色顯示為遞補候選

### 關鍵字規則面板

放在同一頁下方：

- 兩個清單：排除關鍵字、關注關鍵字
- 新增時顯示「目前會命中 N 筆」預覽，確認後套用
- 刪除排除規則時，因該規則被隱藏的項目自動還原（手動隱藏的不受影響）

### Server Actions（加入 `src/lib/actions/radar.ts`）

| Action                                          | 說明                   |
| ----------------------------------------------- | ---------------------- |
| `addRadarKeywordRule(moduleKey, kind, keyword)` | 新增規則並立即套用     |
| `removeRadarKeywordRule(id)`                    | 刪除規則並還原相關項目 |
| `previewRadarKeywordRule(moduleKey, keyword)`   | 回傳命中筆數，不寫入   |

---

## 九、檔案清單

```
新增
  supabase/migrations/2026xxxx_radar_security.sql
  src/config/cwe-labels.ts
  src/config/security-resources.ts
  src/lib/radar/security/{kev,nvd,advisory,malware-filter,enrich}.ts
  src/app/(site)/radar/security/page.tsx
  src/app/admin/(panel)/radar/security/page.tsx
  src/components/radar/security/*.tsx
  src/components/admin/radar/keyword-rules-panel.tsx

修改
  supabase/supabase_schema.sql
  src/types/database.ts
  src/config/radar.ts                  # security 模組、生態系清單、主題關鍵字、惡意套件下載門檻
  src/lib/radar/sync.ts                # 註冊 security 同步函式、支援 ?module= 參數
  src/app/api/cron/radar/route.ts      # 依 module 參數只跑指定模組
  src/lib/data/public-radar.ts
  src/lib/data/admin-radar.ts
  src/lib/actions/radar.ts
  src/config/admin-nav.ts              # 雷達群組新增「資安情資」
  src/app/(site)/radar/page.tsx        # 總覽新增資安區塊
  vercel.json
  .env.example                         # NVD_API_KEY（選用）
```

---

## 十、實作順序

1. 資料庫：關鍵字規則表、RPC、型別
2. 設定檔：生態系、主題關鍵字、CWE 對照、防護資源
3. KEV 與 EPSS 同步，本機跑一次確認近 30 天筆數與排序
4. GitHub Advisory 與惡意套件過濾，確認門檻能把仿冒套件濾掉
5. 分類、KEV 交叉比對、關鍵字規則套用
6. Cron 拆分與 `?module=` 參數
7. 前台頁面與總覽區塊
8. 後台管理頁與關鍵字規則面板
9. 驗證：typecheck、lint、build；檢查主題篩選、排除規則套用與還原、隱藏後遞補

## 十一、部署步驟

1. 執行遷移檔 2.（選用）申請 NVD API key 並加入 Vercel 環境變數 `NVD_API_KEY`
2. 部署後到 Vercel → Settings → Cron Jobs 確認出現第二個排程
3. 後台手動同步一次，檢查兩個榜單內容合理後再設為公開

---

## 十二、風險與待調整

| 項目                    | 說明                                                         | 處理方式                                                                                |
| ----------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| 勒索軟體欄位更新落後    | CISA 常在事後才把欄位改成 Known，且不會公告                  | 每天重新讀取整份 KEV，欄位變動自動反映                                                  |
| 新漏洞的 EPSS 偏低      | EPSS 需要時間累積資料，剛公開的 CVE 分數常常很低             | 排序第一順位是勒索軟體與等級，不單看 EPSS；前台說明這個限制                             |
| 惡意套件門檻            | 1,000 週下載是初始值，可能漏掉剛被入侵、下載量還沒反映的套件 | 寫在設定檔，上線後依實際結果調整                                                        |
| PyPI 等生態系沒有下載量 | 只有 npm 有免費、穩定的下載量 API                            | 非 npm 套件下載量視為 0，只依等級與 EPSS 排序；PyPI 下載量列入 [backlog.md](backlog.md) |
| 主題分類誤判            | 關鍵字比對一定會有誤判                                       | 一筆可屬於多個主題；誤判太多時調整關鍵字清單                                            |
| 內容是英文原文          | 不使用 AI 翻譯                                               | CWE 中文標籤與「升級到 x.y.z」讓重點一眼可讀；需要中文解說時寫成文章                    |
| 執行時間                | 首次同步要補 30 天 EPSS 與惡意套件下載量                     | 獨立 Cron；首次同步可在後台手動分次執行                                                 |
