# 第一期：基礎建設與開源雷達

> 範圍：每日同步排程、快照資料表、GitHub 週榜、Hacker News 週榜、前台 `/radar`、後台雷達管理
> 不在本期：資安模組（[第二期](phase-2-security.md)）、收藏工作台與首頁精選（[第三期](phase-3-collections.md)）
> 已移除：AI 功能、Release 追蹤器、月榜（見 [分期總覽](README.md)）
> 依賴：無，這是後續各期的基礎

---

## 一、目標與驗收條件

| #   | 驗收條件                                                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Vercel Cron 每天台灣時間 02:00 左右自動同步 GitHub 與 HN，後台看得到每個模組的最後同步時間與錯誤訊息                                     |
| 2   | `/radar/github` 顯示「近 7 天新增 star 數」Top 10，可切換分類（全部／AI 工具 & Agent／前端與全端）與程式語言，標示統計期間與最後同步時間 |
| 3   | `/radar/hn` 顯示近 7 天熱門討論與 Show HN 各 Top 10，依 HN 分數排序                                                                      |
| 4   | 後台可切換模組 `hidden` / `public`；`hidden` 時前台路由回 404、導覽列不出現                                                              |
| 5   | 後台可把任一項目設為「隱藏」，前台榜單立即自動遞補滿 10 名；可從「已隱藏」清單還原                                                       |
| 6   | 訪客無法觸發同步或任何寫入；`/api/cron/radar` 沒有正確的 `CRON_SECRET` 一律回 401                                                        |
| 7   | 前台雷達頁維持靜態外殼（`"use cache"`），篩選在用戶端完成，不因查詢參數變成動態頁                                                        |
| 8   | `pnpm typecheck`、`pnpm lint`、`pnpm build` 全數通過                                                                                     |

---

## 二、排名依據（前台會照實標示）

### GitHub 週榜

- **排名指標**：近 7 天新增 star 數 = 最新快照的 star 數 − 7 天前快照的 star 數
- **資格條件**：未封存、非 fork、30 天內有推送、不是 awesome-list 類清單、未被管理員隱藏、7 天增量 > 0
- **候選池**（每天從 GitHub Search 補充，總數控制在約 1,000 個以內）：
  - 新秀：近 30 天建立、star ≥ 50，依 star 排序取前 200
  - 主題：`config/radar.ts` 內的 AI 與前端 topics 各查一次，條件為 30 天內有推送、star ≥ 300，每個 topic 取前 100
  - 連續 30 天沒被搜尋命中、且 7 天增量 < 10 的 repo 移出候選池
- **分類**：比對 topics、名稱、描述與關鍵字清單，一個 repo 可同時屬於多個分類（`categories text[]`）
- **資料暖機**：快照未滿 7 天時，以現有最早的快照計算，前台顯示「資料累積中（目前 N 天）」
- **npm 下載量**：只為每天排名前 30 的 repo 查詢。讀取根目錄 `package.json` 的 `name`（快取在 `data.npm_package`，查不到時記為 `null`，30 天後再試），再呼叫 npm downloads API

### HN 週榜

- **熱門討論**：近 7 天發布的 story，依分數排序；Ask HN 這類沒有外部連結的貼文直接連到 HN 討論頁
- **Show HN**：`show_hn` 標籤，近 7 天，依分數排序
- 每天抓取一次（分數會持續變動），保留 14 天

---

## 三、資料庫設計

新增遷移檔 `supabase/migrations/20261123_radar.sql`，同步更新 `supabase/supabase_schema.sql` 與 `src/types/database.ts`。

```sql
-- 模組設定與同步狀態
create type public.radar_visibility as enum ('hidden', 'public');

create table public.radar_modules (
  key text primary key check (key ~ '^[a-z0-9-]+$'),      -- 'github'、'hn'
  name text not null,
  visibility public.radar_visibility not null default 'hidden',
  sort_order integer not null default 0,
  last_synced_at timestamptz,
  last_sync_status text check (last_sync_status in ('success', 'failed')),
  last_sync_error text,
  updated_at timestamptz not null default now()
);

-- 跨模組通用的項目主檔（第三期收藏會參照這張表）
create table public.radar_items (
  id uuid primary key default gen_random_uuid(),
  module_key text not null references public.radar_modules (key) on delete cascade,
  external_id text not null,                 -- GitHub repo node id、HN objectID
  title text not null,                       -- owner/repo、HN 標題
  url text not null check (url ~ '^https?://'),
  summary text,
  categories text[] not null default '{}',
  data jsonb not null default '{}'::jsonb,   -- 模組專屬欄位（見下方）
  is_blocked boolean not null default false,
  blocked_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_key, external_id)
);

-- 每日指標快照（GitHub 為 star 數），保留 35 天，日後要做月榜不必改結構
create table public.radar_metric_snapshots (
  item_id uuid not null references public.radar_items (id) on delete cascade,
  snapshot_date date not null,
  value bigint not null check (value >= 0),
  primary key (item_id, snapshot_date)
);
```

`data` 欄位內容：

| 模組   | 欄位                                                                                                                                                                                               |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| github | `language`、`topics`、`license`、`stars`、`forks`、`archived`、`is_fork`、`is_list`、`pushed_at`、`repo_created_at`、`npm_package`、`npm_weekly_downloads`、`npm_checked_at`、`last_search_hit_at` |
| hn     | `points`、`num_comments`、`author`、`hn_url`、`domain`、`is_show_hn`、`posted_at`                                                                                                                  |

**RLS 與存取方式**

- 三張表都啟用 RLS；`authenticated` 可讀寫全部（沿用現有慣例）
- `anon` 不直接讀表，改由兩個 `security definer` 函式提供前台資料（`set search_path = ''`，函式內檢查模組為 `public`、項目未隱藏）：
  - `get_github_weekly_ranking(p_limit int default 25)`：回傳每個 repo 的 7 日增量、總 star 與 `data`，依增量排序
  - `get_hn_weekly_ranking(p_show_hn boolean, p_limit int default 25)`
- 回傳 25 筆，前台篩選語言時仍有足夠候選；隱藏項目在函式內就排除，所以會自動遞補

**路由保留字**

- `RESERVED_SECTION_SLUGS` 加入 `radar`
- 資料庫 `sections.slug` 的 check constraint 改成 `('admin', 'api', 'projects', 'archives', 'preview', 'radar')`，順便修正既有的不一致
- 執行遷移前先確認沒有 slug 為 `radar` 的區塊

---

## 四、同步排程

### 環境變數（加入 `.env.example` 與 Vercel）

| 變數                        | 用途                  | 注意                                                  |
| --------------------------- | --------------------- | ----------------------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY` | 排程寫入資料庫        | 只能在 server 端使用，不可加 `NEXT_PUBLIC_`           |
| `CRON_SECRET`               | 驗證 Vercel Cron 請求 | Vercel 會自動帶 `Authorization: Bearer <CRON_SECRET>` |
| `GITHUB_TOKEN`              | GitHub API 認證       | Fine-grained PAT，不勾任何權限（只讀公開資料）        |

`src/lib/env.ts` 新增 `getServerEnv()`（zod 驗證、`server-only`），與現有的 `getPublicEnv()` 分開。

### `vercel.json`

```json
{ "crons": [{ "path": "/api/cron/radar", "schedule": "0 18 * * *" }] }
```

UTC 18:00 = 台灣 02:00。免費方案每天最多一次，觸發時間有 ±59 分鐘誤差。

### `/api/cron/radar`（Route Handler，`GET`）

1. 驗證 `Authorization` header，不符回 401
2. `export const maxDuration = 300`
3. 依序執行 `syncGithub()`、`syncHn()`；各自 try/catch，任一失敗不影響其他模組，結果寫回 `radar_modules`
4. 清理：刪除 35 天前的快照、14 天前的 HN 項目
5. `revalidateTag(CACHE_TAG.RADAR, "max")`（Route Handler 不能用 `updateTag`，單參數寫法已棄用）
6. 回傳各模組的筆數與耗時（JSON），方便在 Vercel Logs 查看

後台「立即同步」按鈕是 Server Action，呼叫同一組 `syncGithub()` / `syncHn()`，結束後改用 `updateTag`。

### GitHub 同步流程（`src/lib/radar/github/`）

1. `search.ts`：依候選池規則呼叫 REST Search API（約 15 次請求，低於每分鐘 30 次上限），upsert 到 `radar_items`
2. `refresh.ts`：GraphQL `nodes(ids: [...])` 每次 100 個，批次更新整個候選池的 star 數與 metadata，寫入今日快照
3. `npm.ts`：計算今日前 30 名，補查 npm 套件名稱與週下載量
4. `prune.ts`：依規則移出候選池
5. `categorize.ts`：純函式，依 `config/radar.ts` 的關鍵字清單計算 `categories` 與 `is_list`

### HN 同步流程（`src/lib/radar/hn.ts`）

- Algolia API：`/api/v1/search?tags=story&numericFilters=created_at_i>{7天前},points>20&hitsPerPage=200`
- Show HN 另查一次 `tags=show_hn`
- upsert 到 `radar_items`（HN 沒有 star 歷史問題，不需要快照表）

---

## 五、前台

### 路由

| 路徑            | 內容                                            |
| --------------- | ----------------------------------------------- |
| `/radar`        | 總覽：每個公開模組顯示前 5 名與「看完整榜單 →」 |
| `/radar/github` | GitHub 週榜                                     |
| `/radar/hn`     | HN 週榜（熱門討論／Show HN 分頁）               |

模組為 `hidden` 時，對應頁面呼叫 `notFound()`。

### 資料層 `src/lib/data/public-radar.ts`

- `"use cache"` + `cacheTag(CACHE_TAG.RADAR)` + `cacheLife("hours")`
- 使用現有的 `createPublicClient()` 呼叫兩個 RPC
- `CACHE_TAG` 新增 `RADAR: "public-radar"`，並加入後台「站務工具」的手動失效清單

### 元件 `src/components/radar/`

- `radar-header.tsx`：標題、統計依據說明、統計期間、最後同步時間
- `github-ranking.tsx`（client）：分類分段控制 + 語言下拉，在 25 筆候選中篩選後取前 10，不足 10 筆時顯示「符合條件 N 筆」
- `github-rank-card.tsx`：名次、`owner/repo`、描述、本週 +N star（主視覺）、總 star、語言、授權、npm 週下載量（有才顯示）、外連圖示
- `hn-ranking.tsx`、`hn-rank-card.tsx`：名次、標題、網域、分數、留言數、發布時間；標題外連原文，「討論 →」連 HN
- 外連沿用 `components/site/external-link.tsx`

### 導覽列

- `buildSiteNavItems` 新增參數 `radarModules`
- 公開模組 0 個：不顯示；1 個：直接連到該模組；2 個以上：「雷達」下拉選單（沿用 `SiteNavGroup`）
- 頁尾自動跟著產生「雷達」欄

### SEO

- 第一期雷達頁設 `robots: { index: false, follow: true }`，不加入 sitemap 與 `llms.txt`
- 等第三期有你的筆記與關聯文章後，再評估是否開放索引

---

## 六、後台

### 側邊欄

`ADMIN_NAV_GROUPS` 在「作品集」與「站務」之間新增「雷達」群組：

- 雷達總覽 `/admin/radar`（`RadarIcon`）
- GitHub 週榜 `/admin/radar/github`（`GithubIcon`／`StarIcon`）
- HN 週榜 `/admin/radar/hn`（`NewspaperIcon`）

### `/admin/radar` 雷達總覽

每個模組一張卡片：

- 公開狀態切換（`Switch`：僅自己可見／公開）
- 最後同步時間、狀態徽章（成功／失敗）、失敗時展開錯誤訊息
- 候選池數量、今日快照數、已隱藏數
- 「立即同步」按鈕（`SubmitButton`，執行中顯示「同步中…」）

### `/admin/radar/github`、`/admin/radar/hn`

- 分頁：目前榜單（前 25 名）／已隱藏
- 表格欄位（GitHub）：名次、repo、分類、語言、本週 +star、總 star、授權、npm、操作
- 操作：「隱藏」／「還原」（Server Action：`requireAdmin()` → 更新 `is_blocked` → `updateTag(CACHE_TAG.RADAR)`）
- 第 11～25 名以淡色顯示，讓你知道隱藏後誰會遞補

### Server Actions `src/lib/actions/radar.ts`

| Action                                      | 說明             |
| ------------------------------------------- | ---------------- |
| `setRadarModuleVisibility(key, visibility)` | 切換模組公開狀態 |
| `setRadarItemBlocked(id, blocked)`          | 隱藏／還原項目   |
| `syncRadarModule(key)`                      | 手動同步單一模組 |

全部先 `requireAdmin()`，輸入以 zod 驗證，回傳現有的 `ActionState` 格式。

---

## 七、檔案清單

```
新增
  supabase/migrations/20261123_radar.sql
  vercel.json
  src/config/radar.ts                      # 模組定義、分類關鍵字、候選池門檻
  src/lib/supabase/service.ts              # service role client（server-only）
  src/lib/radar/github/{search,refresh,npm,prune,categorize}.ts
  src/lib/radar/hn.ts
  src/lib/radar/sync.ts                    # 共用：執行同步、寫回狀態
  src/lib/data/public-radar.ts
  src/lib/data/admin-radar.ts
  src/lib/actions/radar.ts
  src/lib/validations/radar.ts
  src/app/api/cron/radar/route.ts
  src/app/(site)/radar/{page,github/page,hn/page}.tsx
  src/app/admin/(panel)/radar/{page,github/page,hn/page}.tsx
  src/components/radar/*.tsx
  src/components/admin/radar/*.tsx

修改
  supabase/supabase_schema.sql             # 新表、RPC、保留字
  src/types/database.ts
  src/lib/env.ts                           # getServerEnv()
  src/lib/cache-tags.ts                    # CACHE_TAG.RADAR
  src/lib/constants/content.ts             # RESERVED_SECTION_SLUGS 加 radar
  src/config/routes.ts                     # RADAR 相關路由、API_ROUTES.CRON_RADAR
  src/config/site-nav.ts                   # 雷達導覽
  src/config/admin-nav.ts                  # 雷達群組
  src/proxy.ts                             # 確認 /api/cron 不被導向登入
  .env.example
```

---

## 八、實作順序

1. 資料庫：遷移檔、schema、型別、保留字
2. 環境變數與 service role client
3. 分類與候選池規則（`config/radar.ts`、`categorize.ts`）
4. GitHub 與 HN 同步邏輯、Cron Route、`vercel.json`
5. 本機以 `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/radar` 跑一次，確認資料寫入
6. 前台資料層與頁面、導覽列
7. 後台頁面與 Server Actions
8. 驗證：typecheck、lint、build；在預覽中檢查前後台、模組隱藏後回 404、隱藏項目後自動遞補

## 九、部署步驟

1. 在 Supabase SQL Editor 執行 `20261123_radar.sql`
2. Vercel 專案設定加入 `SUPABASE_SERVICE_ROLE_KEY`、`CRON_SECRET`、`GITHUB_TOKEN`（僅 Production 與 Preview）
3. 部署後到 Vercel → Settings → Cron Jobs 確認排程出現，可先手動觸發一次
4. 後台確認同步成功後，再把模組切成「公開」

---

## 十、風險與待調整

| 項目                     | 說明                                               | 處理方式                                            |
| ------------------------ | -------------------------------------------------- | --------------------------------------------------- |
| 候選池門檻               | star ≥ 50／≥ 300 是初始值，可能漏掉或塞進太多 repo | 寫在 `config/radar.ts`，上線兩週後依實際榜單調整    |
| 前 7 天沒有完整資料      | 快照需要累積                                       | 前台顯示「資料累積中」，模組可先保持 `hidden`       |
| 刷假星                   | 少數 repo 會買 star 衝榜                           | 後台隱藏；之後可加「star 增量 / fork 增量」異常偵測 |
| Algolia HN API 沒有 SLA  | 偶爾失敗                                           | 單模組失敗不影響其他模組，前台沿用上一次的資料      |
| Vercel Cron 失敗不會通知 | 可能幾天沒同步都沒發現                             | 後台總覽顯示「超過 36 小時未同步」警示              |

---

## 十一、為後續各期預留的設計

第一期就要照這些方向寫，後面兩期才不用改結構：

| 預留點              | 第一期的做法                                                                                                          | 用在哪一期                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| 同步流程可插拔      | `src/lib/radar/sync.ts` 以「模組 key → 同步函式」的對照表執行，新增模組只要註冊一個函式                               | 第二期加入 `kev`、`advisory`       |
| 前台 RPC 的回傳格式 | 每個模組的 RPC 都回傳 `item_id`、`title`、`url`、`categories`、`data`、排名分數，前台卡片元件只依賴這些欄位           | 第二期資安卡片、第三期首頁精選     |
| 清理不能刪到收藏    | `prune.ts` 與 HN 過期清理只刪除 `radar_items`，第三期會加上「已收藏的不刪」條件；第一期先把刪除條件集中寫在一個函式裡 | 第三期                             |
| 分類規則集中管理    | 關鍵字清單只寫在 `config/radar.ts`，`categorize.ts` 是純函式                                                          | 第二期的資安主題篩選沿用同一個函式 |
| 後台模組頁共用元件  | 榜單表格、隱藏／還原按鈕、同步狀態卡片做成可共用元件                                                                  | 第二期資安管理頁                   |
