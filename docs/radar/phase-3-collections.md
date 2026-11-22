# 第三期：收藏工作台

> 範圍：雙層快照收藏、研究狀態／筆記／標籤、每日更新收藏的最新數據、儀表板收藏統計、首頁「近期雷達精選」（選做）
> 暫緩：關聯文章、轉文章草稿、前台「閱讀實戰筆記 →」（目前不寫文章，見[八、暫緩項目](#八暫緩項目)）
> 不在本期：收藏公開分享（收藏一律私人）、AI 筆記輔助（已移除）
> 依賴：[第一期](phase-1-github-hn.md)的 `radar_items` 與後台榜單頁、[第二期](phase-2-security.md)的資安榜單

本期分成 3 個階段，每個階段各開一個 session 完成並 commit，依序進行（後面的階段依賴前面建好的資料表）：

| 階段                                          | 內容                                                           | 完成後                   |
| --------------------------------------------- | -------------------------------------------------------------- | ------------------------ |
| [第 1 階段](#三第-1-階段資料庫收藏與每日更新) | 資料庫、榜單「收藏」按鈕與快照、清理不刪收藏、每日更新最新數據 | 執行遷移檔，收藏幾筆測試 |
| [第 2 階段](#四第-2-階段收藏列表與詳細頁)     | 收藏列表、詳細頁（狀態／筆記／標籤／快照對照）、儀表板統計卡   | 部署                     |
| [第 3 階段](#五第-3-階段首頁近期雷達精選選做) | 首頁「近期雷達精選」（選做，與收藏無關，可單獨決定做不做）     | 部署                     |

---

## 一、研究流程

```
雷達榜單 ──收藏──► 待研究 ──► 評估中 ──► 已採用
                              │
                              └──────► 封存
```

| 狀態                    | 意思                             |
| ----------------------- | -------------------------------- |
| 待研究（`to_research`） | 剛收藏，還沒看                   |
| 評估中（`evaluating`）  | 正在讀文件、試用                 |
| 已採用（`adopted`）     | 決定用在專案裡                   |
| 封存（`archived`）      | 不再追蹤，也不再每日更新最新數據 |

日後要寫文章時，再以 `alter type ... add value 'written'` 加上「已寫文」狀態（見暫緩項目）。

---

## 二、資料庫設計

遷移檔 `supabase/migrations/2026xxxx_radar_collections.sql`（第 1 階段建立）。

```sql
create type public.radar_collection_status as enum
  ('to_research', 'evaluating', 'adopted', 'archived');

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
  -- 保留給暫緩項目（關聯文章），本期不提供介面
  post_id uuid references public.posts (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_key, external_id)
);

create index radar_collections_status_idx on public.radar_collections (status, updated_at desc);
create index radar_collections_tags_idx on public.radar_collections using gin (tags);
```

**RLS**：只有 `authenticated` 可讀寫，`anon` 沒有任何權限。前台 RPC 一律不讀收藏表。

### 快照內容

`snapshot_at_save` = 收藏當下的 `radar_items.data`，再加上排名情境：

| 模組                 | 額外保存的排名情境                 |
| -------------------- | ---------------------------------- |
| github               | 當週名次、7 日 star 增量、統計期間 |
| hn                   | 當週名次、分數、留言數             |
| security（KEV）      | 名次、EPSS、勒索軟體標記           |
| security（Advisory） | 名次、等級、EPSS、修補版本         |

### 清理不刪收藏

所有模組刪除項目都經過 `src/lib/radar/items.ts` 的 `removeRadarItems`（已預留註解），只要在這裡排除已收藏的項目，GitHub、HN、資安的清理都會生效，不必逐一修改各模組。

---

## 三、第 1 階段：資料庫、收藏與每日更新

### 範圍

1. 遷移檔：收藏表、enum、索引、RLS；同步更新 `supabase/supabase_schema.sql` 與 `src/types/database.ts`
2. 清理不刪收藏：`removeRadarItems` 排除 `radar_collections.item_id` 指到的項目
3. 收藏與快照：`src/lib/radar/collections/snapshot.ts` 組出快照；Server Action `collectRadarItemAction(itemId)`
4. 榜單頁「收藏」按鈕：GitHub、HN、資安三個後台榜單表格的操作欄新增「收藏／已收藏」
   - 收藏：建立 `radar_collections`，寫入快照
   - 已收藏：顯示「已收藏」徽章（第 2 階段改成連到詳細頁）；不提供在榜單上取消收藏，避免誤刪筆記
5. 每日更新最新數據：`src/lib/radar/collections/refresh.ts` 的 `refreshCollections()`，在 `src/lib/radar/sync.ts` 所有模組同步完後執行，只處理狀態不是「封存」的收藏：

| 模組                 | 做法                                                        |
| -------------------- | ----------------------------------------------------------- |
| github               | 和第一期一樣用 GraphQL `nodes(ids: [...])`，每次 100 個     |
| hn                   | Algolia 搜尋 `tags=story,(story_<id>,…)` 批次取分數與留言數 |
| security（KEV）      | 項目超過 60 天被清理後，從整份 KEV 目錄比對                 |
| security（Advisory） | `GET /advisories/{ghsa_id}`                                 |

- 項目仍在 `radar_items` 時，直接複製當天同步好的 `data`，不重複呼叫 API
- 來源回 404 時設 `latest_unavailable = true`，保留最後一次的 `latest_data`
- 更新失敗不影響各模組的同步結果

### 檔案

```
新增
  supabase/migrations/2026xxxx_radar_collections.sql
  src/lib/radar/collections/{snapshot,refresh}.ts
  src/lib/actions/radar-collections.ts       # collectRadarItemAction
  src/lib/validations/radar-collection.ts
  src/components/admin/radar/radar-collect-button.tsx

修改
  supabase/supabase_schema.sql
  src/types/database.ts
  src/lib/radar/items.ts                     # removeRadarItems 不刪收藏
  src/lib/radar/sync.ts                      # 最後執行 refreshCollections()
  src/components/admin/radar/radar-ranking-table.tsx  # 操作欄加收藏按鈕
  src/lib/data/admin-radar.ts                # 榜單附上是否已收藏
```

### 驗收

- [ ] 三個後台榜單的每一列都有「收藏」按鈕，收藏後變成「已收藏」，重複收藏不會建立第二筆
- [ ] 收藏的 `snapshot_at_save` 含有完整 `data` 與名次等排名情境
- [ ] 收藏的項目在同步清理時不會被刪除
- [ ] 同步後 `latest_data`、`latest_refreshed_at` 有更新；封存的收藏不更新
- [ ] 以匿名身分呼叫 Supabase 讀不到 `radar_collections`
- [ ] `pnpm typecheck`、`pnpm lint`、`pnpm build` 全數通過

完成後：使用者在 Supabase SQL Editor 執行遷移檔，到後台收藏幾筆，隔天確認最新數據有更新。

---

## 四、第 2 階段：收藏列表與詳細頁

### `/admin/radar/collections` 收藏列表

- 狀態分頁：全部／待研究／評估中／已採用／封存（顯示各自筆數）
- 篩選：模組、標籤、標題搜尋（沿用文章列表以查詢參數保存篩選的做法）
- 欄位：標題、模組、狀態（可直接切換）、標籤、收藏日期、**收藏後變化**（例如「★ +8.8k」「EPSS 12% → 41%」）
- 分頁沿用 `posts-pagination.tsx`

### `/admin/radar/collections/[id]` 收藏詳細頁

| 區塊     | 內容                                                                                |
| -------- | ----------------------------------------------------------------------------------- |
| 標題列   | 標題、模組徽章、外部連結、收藏日期、最後更新時間；來源已刪除時顯示警示              |
| 研究     | 狀態選單、標籤輸入（沿用 `tech-stack-input.tsx` 的互動方式）                        |
| 筆記     | Markdown 文字框，支援預覽（預覽用 `markdownToEditorHtml` + 現有的 `sanitize-html`） |
| 快照對照 | 兩欄表格：收藏當下／最新，數值欄位顯示差異；「重新整理最新數據」按鈕                |
| 操作     | 刪除收藏（確認對話框，提醒筆記會一起刪除）                                          |

### 其他

- 榜單頁的「已收藏」改成連到該收藏的詳細頁
- 後台導覽「雷達」群組新增「收藏」
- 管理儀表板新增統計卡：待研究、評估中各幾筆，點擊進入收藏列表的對應分頁

### Server Actions（加入 `src/lib/actions/radar-collections.ts`）

| Action                                                    | 說明                 |
| --------------------------------------------------------- | -------------------- |
| `updateRadarCollectionAction(id, { status, note, tags })` | 更新研究欄位         |
| `refreshRadarCollectionAction(id)`                        | 手動更新單筆最新數據 |
| `deleteRadarCollectionAction(id)`                         | 刪除收藏             |

### 檔案

```
新增
  src/lib/data/admin-radar-collections.ts
  src/app/admin/(panel)/radar/collections/page.tsx
  src/app/admin/(panel)/radar/collections/[id]/page.tsx
  src/components/admin/radar/collections/*.tsx

修改
  src/lib/actions/radar-collections.ts
  src/lib/validations/radar-collection.ts
  src/components/admin/radar/radar-collect-button.tsx   # 已收藏 → 連到詳細頁
  src/config/routes.ts
  src/config/admin-nav.ts                    # 雷達群組新增「收藏」
  src/app/admin/(panel)/dashboard/page.tsx   # 收藏統計卡
```

### 驗收

- [ ] 收藏列表的狀態分頁、模組／標籤／標題篩選、分頁都正常，篩選條件保存在網址
- [ ] 詳細頁可切換狀態、寫 Markdown 筆記並預覽、加標籤（最多 10 個）
- [ ] 快照對照能並排看「收藏當下」與「最新」，「重新整理最新數據」可手動更新
- [ ] 刪除收藏有確認對話框；刪除後榜單上該項目回到「收藏」按鈕
- [ ] 儀表板統計卡數字正確，點擊進入對應分頁
- [ ] `pnpm typecheck`、`pnpm lint`、`pnpm build` 全數通過

---

## 五、第 3 階段：首頁「近期雷達精選」（選做）

與收藏無關，只讀公開榜單，可以單獨決定做不做。

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

### 檔案

```
新增
  src/components/home/radar-picks.tsx

修改
  src/config/home.ts                         # HOME_RADAR_PICKS
  src/app/(site)/page.tsx                    # 首頁新增雷達精選
```

### 驗收

- [ ] 首頁出現雷達精選，數量依設定檔；模組全部隱藏時整段不顯示
- [ ] 首頁仍為靜態預渲染（build 輸出為 ○ 或 ◐），同步後內容更新
- [ ] `pnpm typecheck`、`pnpm lint`、`pnpm build` 全數通過

---

## 六、驗證重點（每個階段都要）

- 讀程式先用 `codegraph_explore`，不要整份 `cat`；build、lint 輸出只看結尾或過濾後的部分
- 訪客的網路請求中沒有任何收藏欄位（筆記、標籤、狀態）
- commit 訊息用繁體中文，不加 Co-Authored-By

---

## 七、風險與待調整

| 項目                   | 說明                                                | 處理方式                                                            |
| ---------------------- | --------------------------------------------------- | ------------------------------------------------------------------- |
| 收藏的 repo 改名或刪除 | GraphQL 以 node id 查詢，改名仍可追蹤；刪除則查不到 | 設 `latest_unavailable`，保留最後一次數據並顯示警示                 |
| 筆記洩漏               | 收藏表放著私人筆記                                  | RLS 只開放 `authenticated`；前台 RPC 不讀收藏表；驗收時檢查網路請求 |
| 每日更新量增加         | 收藏越多，Cron 越久                                 | 封存的收藏不更新；GitHub 用批次查詢，數百筆仍在幾秒內完成           |
| 首頁變長（第 3 階段）  | 新增一個區塊                                        | 精選數量寫在設定檔，預設最多 4 張卡片                               |

---

## 八、暫緩項目

目前不寫文章，以下項目先不做。收藏表已預留 `post_id` 欄位，日後要做時不必改表結構：

| 項目                   | 內容                                                                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 「已寫文」狀態         | `alter type public.radar_collection_status add value 'written'`；關聯文章首次發布時自動切換                                                                |
| 關聯文章               | 詳細頁加「關聯文章」選單（搜尋站內文章），收藏列表加「關聯文章」欄位                                                                                       |
| 轉為文章草稿           | 前往 `/admin/posts/new?fromCollection=<id>`，預填標題與「來源連結 + 筆記」的 Markdown；`savePostAction` 收到 `collectionId` 時把 `post_id` 指向新文章      |
| 前台「閱讀實戰筆記 →」 | 各榜單 RPC 以 `left join` 帶出已發布文章的網址（只在 `status = 'published' and published_at <= now()` 時回傳），卡片下方顯示連結；關聯或發布時 `updateTag` |
| 文章被刪除             | `post_id` 變成 null，收藏保留、狀態不自動改回，詳細頁提示「關聯文章已刪除」                                                                                |

會改到的現有檔案：`src/app/admin/(panel)/posts/new/page.tsx`、`src/components/admin/posts/post-form.tsx`、`src/lib/actions/posts.ts`、`src/lib/validations/post.ts`、各榜單 RPC 與 `src/components/radar/*` 卡片。
