# 第三期：收藏工作台與站內整合

> 範圍：雙層快照收藏、研究狀態／筆記／標籤、關聯文章、一鍵轉文章草稿、前台「閱讀實戰筆記 →」、首頁「近期雷達精選」、儀表板收藏統計
> 不在本期：收藏公開分享（收藏一律私人，要公開就寫成文章）、AI 筆記輔助（已移除）
> 依賴：[第一期](phase-1-github-hn.md)的 `radar_items` 與後台榜單頁。[第二期](phase-2-security.md)完成後，資安項目也能收藏；沒做第二期也能先上線

---

## 一、目標與驗收條件

| #   | 驗收條件                                                                                 |
| --- | ---------------------------------------------------------------------------------------- |
| 1   | 後台每個榜單（GitHub、HN、資安）的每一列都有「收藏」按鈕，收藏時永久保存當下的完整數據   |
| 2   | 收藏的項目就算從榜單消失、被同步清理刪除，收藏仍然完整保留，可以看到原始標題、連結與快照 |
| 3   | 每天同步時順便更新已收藏項目的最新數據，詳細頁可以並排比較「收藏當下」與「最新」         |
| 4   | 收藏有 5 種研究狀態，可寫 Markdown 筆記、加標籤（最多 10 個）、關聯一篇站內文章          |
| 5   | 「轉為文章草稿」會開啟新增文章頁，自動帶入標題、來源連結與筆記，存檔後自動關聯回收藏     |
| 6   | 關聯的文章正式發布後，收藏狀態自動改成「已寫文」，前台該項目的卡片出現「閱讀實戰筆記 →」 |
| 7   | 首頁出現「近期雷達精選」，自動取公開模組的週榜前幾名；所有模組都隱藏時整段不顯示         |
| 8   | 訪客永遠看不到收藏、筆記與標籤；前台只會拿到「已發布文章」的連結                         |
| 9   | `pnpm typecheck`、`pnpm lint`、`pnpm build` 全數通過                                     |

---

## 二、研究流程

```
雷達榜單 ──收藏──► 待研究 ──► 評估中 ──► 已採用 ──► 已寫文
                              │                      ▲
                              └──────► 封存           │
                                                 文章發布時自動切換
```

| 狀態                    | 意思                             |
| ----------------------- | -------------------------------- |
| 待研究（`to_research`） | 剛收藏，還沒看                   |
| 評估中（`evaluating`）  | 正在讀文件、試用                 |
| 已採用（`adopted`）     | 決定用在專案裡                   |
| 已寫文（`written`）     | 已發布對應文章                   |
| 封存（`archived`）      | 不再追蹤，也不再每日更新最新數據 |

---

## 三、資料庫設計

遷移檔 `supabase/migrations/2026xxxx_radar_collections.sql`。

```sql
create type public.radar_collection_status as enum
  ('to_research', 'evaluating', 'adopted', 'written', 'archived');

create table public.radar_collections (
  id uuid primary key default gen_random_uuid(),
  -- 項目被清理後設為 null，收藏仍保留；module_key + external_id 用來辨識與防止重複收藏
  item_id uuid unique references public.radar_items (id) on delete set null,
  module_key text not null references public.radar_modules (key) on delete restrict,
  external_id text not null,
  -- 複製一份標題與連結，項目被刪除後仍看得到
  title text not null,
  url text not null check (url ~ '^https?://'),

  -- 雙層快照
  snapshot_at_save jsonb not null,        -- 收藏當下凍結，之後永不修改
  saved_at timestamptz not null default now(),
  latest_data jsonb,                       -- 每日同步更新
  latest_refreshed_at timestamptz,
  latest_unavailable boolean not null default false,  -- 來源已刪除或改名（例如 repo 404）

  -- 研究工作台
  status public.radar_collection_status not null default 'to_research',
  note text not null default '' check (char_length(note) <= 20000),
  tags text[] not null default '{}' check (cardinality(tags) <= 10),
  post_id uuid references public.posts (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_key, external_id)
);

create index radar_collections_status_idx on public.radar_collections (status, updated_at desc);
create index radar_collections_post_id_idx on public.radar_collections (post_id);
create index radar_collections_tags_idx on public.radar_collections using gin (tags);
```

**RLS**：只有 `authenticated` 可讀寫，`anon` 沒有任何權限。

### 快照內容

`snapshot_at_save` = 收藏當下的 `radar_items.data`，再加上排名情境：

| 模組                 | 額外保存的排名情境                 |
| -------------------- | ---------------------------------- |
| github               | 當週名次、7 日 star 增量、統計期間 |
| hn                   | 當週名次、分數、留言數             |
| security（KEV）      | 名次、EPSS、勒索軟體標記           |
| security（Advisory） | 名次、等級、EPSS、修補版本         |

### 對前面兩期的修改

- **清理不刪收藏**：第一期、第二期的清理函式加上條件 `not exists (select 1 from radar_collections c where c.item_id = radar_items.id)`
- **前台 RPC 加上文章連結**：各榜單 RPC 以 `left join` 帶出 `radar_collections.post_id` 對應的文章，只在文章 `status = 'published' and published_at <= now()` 時回傳文章網址（區塊代稱 + 文章代稱），其他欄位一律不回傳

---

## 四、同步：更新最新數據

在每日 Cron 的最後加一個步驟 `refreshCollections()`（`src/lib/radar/collections/refresh.ts`），只處理狀態不是「封存」的收藏：

| 模組                 | 做法                                                    |
| -------------------- | ------------------------------------------------------- |
| github               | 和第一期一樣用 GraphQL `nodes(ids: [...])`，每次 100 個 |
| hn                   | Algolia `GET /api/v1/items/{id}` 取最新分數與留言數     |
| security（KEV）      | 同步時已下載整份 KEV，直接比對                          |
| security（Advisory） | `GET /advisories/{ghsa_id}`                             |

- 項目仍在 `radar_items` 時，直接複製當天同步好的 `data`，不重複呼叫 API
- 來源回 404 時設 `latest_unavailable = true`，保留最後一次的 `latest_data`

---

## 五、後台

### 榜單頁新增「收藏」按鈕

第一期、第二期的榜單表格操作欄新增「收藏／已收藏」切換：

- 收藏：建立 `radar_collections`，寫入快照
- 已收藏：點擊連到該收藏的詳細頁（不提供在榜單上取消收藏，避免誤刪筆記）

### `/admin/radar/collections` 收藏列表

- 狀態分頁：全部／待研究／評估中／已採用／已寫文／封存（顯示各自筆數）
- 篩選：模組、標籤、標題搜尋（沿用文章列表以查詢參數保存篩選的做法）
- 欄位：標題、模組、狀態（可直接切換）、標籤、收藏日期、關聯文章、**收藏後變化**（例如「★ +8.8k」「EPSS 12% → 41%」）
- 分頁沿用 `posts-pagination.tsx`

### `/admin/radar/collections/[id]` 收藏詳細頁

| 區塊     | 內容                                                                                       |
| -------- | ------------------------------------------------------------------------------------------ |
| 標題列   | 標題、模組徽章、外部連結、收藏日期、最後更新時間；來源已刪除時顯示警示                     |
| 研究     | 狀態選單、標籤輸入（沿用 `tech-stack-input.tsx` 的互動方式）、關聯文章選單（搜尋站內文章） |
| 筆記     | Markdown 文字框，支援預覽（預覽用 `markdownToEditorHtml` + 現有的 `sanitize-html`）        |
| 快照對照 | 兩欄表格：收藏當下／最新，數值欄位顯示差異；「重新整理最新數據」按鈕                       |
| 操作     | 轉為文章草稿、刪除收藏（確認對話框，提醒筆記會一起刪除）                                   |

### 轉為文章草稿

不在伺服器端產生文章內容，改走現有的新增文章流程，所有驗證規則都不用重寫：

1. 按下「轉為文章草稿」→ 前往 `/admin/posts/new?fromCollection=<id>`
2. 新增文章頁讀取收藏，預先填入：
   - 標題：收藏標題（可修改）
   - 內文：組成 Markdown（來源連結 + 筆記），用現有的 `markdownToEditorHtml` 轉換後放進編輯器
   - 隱藏欄位 `collectionId`
3. 你選擇區塊、分類、修改內容後按「儲存草稿」
4. `savePostAction` 收到 `collectionId` 時，建立文章後把 `radar_collections.post_id` 指向新文章
5. 該文章日後第一次正式發布時（`savePostAction` 已有 `wasPublic` / `isPublic` 判斷），把關聯收藏的狀態改成「已寫文」

### 儀表板

管理儀表板新增一張統計卡：待研究、評估中各幾筆，點擊進入收藏列表的對應分頁。

### Server Actions `src/lib/actions/radar-collections.ts`

| Action                                                      | 說明                 |
| ----------------------------------------------------------- | -------------------- |
| `collectRadarItem(itemId)`                                  | 建立收藏與快照       |
| `updateRadarCollection(id, { status, note, tags, postId })` | 更新研究欄位         |
| `refreshRadarCollection(id)`                                | 手動更新單筆最新數據 |
| `deleteRadarCollection(id)`                                 | 刪除收藏             |

關聯文章或狀態變成「已寫文」時，呼叫 `updateTag(CACHE_TAG.RADAR)`，讓前台立即出現「閱讀實戰筆記 →」。

---

## 六、前台

### 「閱讀實戰筆記 →」

- 第一期、第二期的榜單卡片：RPC 有回傳文章網址時，在卡片下方顯示「閱讀實戰筆記 →」，連到站內文章
- 外部連結（GitHub、HN、NVD）維持不變

### 首頁「近期雷達精選」

- 位置：「最新文章」之後、「探索主題」之前
- 內容由設定檔決定，預設：

```ts
// src/config/home.ts
export const HOME_RADAR_PICKS = [
  { module: "github", limit: 3 },
  { module: "security", list: "kev", limit: 1 },
] as const
```

- 只取公開模組；全部模組都隱藏時整段不顯示
- 精簡卡片：名次、標題、一個主要數字（本週 +star／EPSS）、「看完整雷達 →」
- 首頁資料加上 `cacheTag(CACHE_TAG.RADAR)`，每日同步後自動更新，首頁仍是靜態預渲染

---

## 七、檔案清單

```
新增
  supabase/migrations/2026xxxx_radar_collections.sql
  src/lib/radar/collections/{snapshot,refresh}.ts
  src/lib/data/admin-radar-collections.ts
  src/lib/actions/radar-collections.ts
  src/lib/validations/radar-collection.ts
  src/app/admin/(panel)/radar/collections/page.tsx
  src/app/admin/(panel)/radar/collections/[id]/page.tsx
  src/components/admin/radar/collections/*.tsx
  src/components/home/radar-picks.tsx

修改
  supabase/supabase_schema.sql         # 新表、清理條件、RPC 加上文章連結
  src/types/database.ts
  src/lib/radar/sync.ts                # 最後執行 refreshCollections()
  src/lib/radar/github/prune.ts        # 不刪收藏
  src/lib/radar/hn.ts                  # 不刪收藏
  src/lib/radar/security/*.ts          # 不刪收藏（有做第二期時）
  src/components/admin/radar/*         # 榜單表格加收藏按鈕
  src/components/radar/*               # 卡片加「閱讀實戰筆記 →」
  src/app/admin/(panel)/posts/new/page.tsx     # 讀取 fromCollection
  src/components/admin/posts/post-form.tsx     # 預填內容、隱藏欄位 collectionId
  src/lib/actions/posts.ts             # 建立後關聯收藏、首次發布時更新狀態
  src/lib/validations/post.ts          # collectionId（選填）
  src/app/admin/(panel)/dashboard/page.tsx     # 收藏統計卡
  src/config/admin-nav.ts              # 雷達群組新增「收藏」
  src/config/home.ts                   # HOME_RADAR_PICKS
  src/app/(site)/page.tsx              # 首頁新增雷達精選
```

---

## 八、實作順序

1. 資料庫：收藏表、清理條件、RPC 加文章連結
2. 收藏與快照：榜單頁「收藏」按鈕、`collectRadarItem`
3. 收藏列表與詳細頁（狀態、筆記、標籤、快照對照）
4. 每日更新最新數據 `refreshCollections()`
5. 轉為文章草稿：新增文章頁預填、`savePostAction` 關聯與發布時更新狀態
6. 前台「閱讀實戰筆記 →」
7. 首頁「近期雷達精選」與儀表板統計卡
8. 驗證：typecheck、lint、build；確認訪客的網路請求中沒有任何收藏欄位、清理後收藏仍在、文章發布後前台連結出現

## 九、部署步驟

1. 執行遷移檔
2. 部署後在後台收藏幾筆項目，隔天確認最新數據有更新
3. 用一筆收藏走完「轉為文章草稿 → 發布」，確認狀態與前台連結

---

## 十、風險與待調整

| 項目                   | 說明                                                | 處理方式                                                                              |
| ---------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 收藏的 repo 改名或刪除 | GraphQL 以 node id 查詢，改名仍可追蹤；刪除則查不到 | 設 `latest_unavailable`，保留最後一次數據並顯示警示                                   |
| 筆記洩漏               | 收藏表放著私人筆記                                  | RLS 只開放 `authenticated`；前台 RPC 只回傳已發布文章的網址；驗收時檢查訪客的網路請求 |
| 每日更新量增加         | 收藏越多，Cron 越久                                 | 封存的收藏不更新；GitHub 用批次查詢，數百筆仍在幾秒內完成                             |
| 文章被刪除             | `post_id` 變成 null                                 | 收藏保留，狀態不自動改回；詳細頁提示「關聯文章已刪除」                                |
| 首頁變長               | 新增一個區塊                                        | 精選數量寫在設定檔，預設最多 4 張卡片                                                 |
