-- =============================================================================
-- 雷達第三期（第 1 階段）：收藏工作台 — 雙層快照收藏、研究狀態／筆記／標籤
-- 執行方式：Supabase 後台 → SQL Editor 貼上執行；需先執行 20261123_radar.sql；可重複執行
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'radar_collection_status') then
    create type public.radar_collection_status as enum
      ('to_research', 'evaluating', 'adopted', 'archived');
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- 收藏：item_id 在項目被刪除後設為 null，收藏仍保留；module_key + external_id 用來辨識與防止重複收藏
-- snapshot_at_save 為收藏當下凍結的 data 與排名情境，之後永不修改；latest_data 由每日同步更新
-- -----------------------------------------------------------------------------
create table if not exists public.radar_collections (
  id uuid primary key default gen_random_uuid(),
  item_id uuid unique references public.radar_items (id) on delete set null,
  module_key text not null references public.radar_modules (key) on delete restrict,
  external_id text not null,
  -- 複製一份標題與連結，項目被刪除後仍看得到
  title text not null,
  url text not null check (url ~ '^https?://'),

  -- 雙層快照
  snapshot_at_save jsonb not null,
  saved_at timestamptz not null default now(),
  latest_data jsonb,
  latest_refreshed_at timestamptz,
  -- 來源已刪除或改名（例如 repo 404），保留最後一次的 latest_data
  latest_unavailable boolean not null default false,

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

create index if not exists radar_collections_status_idx
  on public.radar_collections (status, updated_at desc);
create index if not exists radar_collections_tags_idx
  on public.radar_collections using gin (tags);

drop trigger if exists radar_collections_set_updated_at on public.radar_collections;
create trigger radar_collections_set_updated_at
  before update on public.radar_collections
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Row Level Security：收藏一律私人，匿名訪客沒有任何權限，前台 RPC 也不讀這張表
-- 排程以 service role 更新最新數據（不受 RLS 限制）；已認證用戶（管理員）可讀寫全部
-- -----------------------------------------------------------------------------
alter table public.radar_collections enable row level security;

revoke all on public.radar_collections from anon;
grant select, insert, update, delete on public.radar_collections to authenticated, service_role;

drop policy if exists "radar_collections_all_authenticated" on public.radar_collections;
create policy "radar_collections_all_authenticated" on public.radar_collections
  for all to authenticated
  using (true) with check (true);

notify pgrst, 'reload schema';
