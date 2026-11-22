-- =============================================================================
-- 雷達模組第一期：模組設定、通用項目主檔、每日指標快照、前台排名函式
-- 執行方式：Supabase 後台 → SQL Editor 貼上執行；可重複執行
-- =============================================================================

-- 執行前確認沒有內容區塊占用 /radar 網址，否則新增保留字的 check constraint 會失敗
do $$
begin
  if exists (select 1 from public.sections where slug = 'radar') then
    raise exception '已有代稱為 radar 的內容區塊，請先在後台修改該區塊的網址代稱再執行此遷移';
  end if;
end
$$;

-- 區塊代稱保留字與 src/lib/constants/content.ts 的 RESERVED_SECTION_SLUGS 一致（順便補上 archives、preview）
alter table public.sections drop constraint if exists sections_slug_check;
alter table public.sections add constraint sections_slug_check check (
  slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  and slug not in ('admin', 'api', 'projects', 'archives', 'preview', 'radar')
);

-- -----------------------------------------------------------------------------
-- 資料表
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'radar_visibility') then
    create type public.radar_visibility as enum ('hidden', 'public');
  end if;
end
$$;

create table if not exists public.radar_modules (
  key text primary key check (key ~ '^[a-z0-9-]+$'),
  name text not null,
  visibility public.radar_visibility not null default 'hidden',
  sort_order integer not null default 0,
  last_synced_at timestamptz,
  last_sync_status text check (last_sync_status in ('success', 'failed')),
  last_sync_error text,
  updated_at timestamptz not null default now()
);

create table if not exists public.radar_items (
  id uuid primary key default gen_random_uuid(),
  module_key text not null references public.radar_modules (key) on delete cascade,
  external_id text not null,
  title text not null,
  url text not null check (url ~ '^https?://'),
  summary text,
  categories text[] not null default '{}',
  data jsonb not null default '{}'::jsonb,
  is_blocked boolean not null default false,
  blocked_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_key, external_id)
);

create index if not exists radar_items_module_blocked_idx
  on public.radar_items (module_key, is_blocked);

create table if not exists public.radar_metric_snapshots (
  item_id uuid not null references public.radar_items (id) on delete cascade,
  snapshot_date date not null,
  value bigint not null check (value >= 0),
  primary key (item_id, snapshot_date)
);

create index if not exists radar_metric_snapshots_date_idx
  on public.radar_metric_snapshots (snapshot_date);

drop trigger if exists radar_modules_set_updated_at on public.radar_modules;
create trigger radar_modules_set_updated_at
  before update on public.radar_modules
  for each row execute function public.set_updated_at();

drop trigger if exists radar_items_set_updated_at on public.radar_items;
create trigger radar_items_set_updated_at
  before update on public.radar_items
  for each row execute function public.set_updated_at();

-- 預設模組：一律先隱藏，資料累積且確認同步正常後再於後台公開
insert into public.radar_modules (key, name, sort_order)
values ('github', 'GitHub 週榜', 0), ('hn', 'Hacker News 週榜', 1)
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- Row Level Security：匿名訪客對三張表沒有任何權限，前台資料一律經由下方 SECURITY DEFINER 函式
-- 排程以 service role 寫入（不受 RLS 限制）；已認證用戶（管理員）可讀寫全部
-- -----------------------------------------------------------------------------
alter table public.radar_modules enable row level security;
alter table public.radar_items enable row level security;
alter table public.radar_metric_snapshots enable row level security;

revoke all on public.radar_modules, public.radar_items, public.radar_metric_snapshots from anon;
grant select, insert, update, delete
  on public.radar_modules, public.radar_items, public.radar_metric_snapshots
  to authenticated, service_role;

drop policy if exists "radar_modules_all_authenticated" on public.radar_modules;
create policy "radar_modules_all_authenticated" on public.radar_modules
  for all to authenticated
  using (true) with check (true);

drop policy if exists "radar_items_all_authenticated" on public.radar_items;
create policy "radar_items_all_authenticated" on public.radar_items
  for all to authenticated
  using (true) with check (true);

drop policy if exists "radar_metric_snapshots_all_authenticated" on public.radar_metric_snapshots;
create policy "radar_metric_snapshots_all_authenticated" on public.radar_metric_snapshots
  for all to authenticated
  using (true) with check (true);

-- -----------------------------------------------------------------------------
-- 排名函式
-- radar_*_ranking：不檢查模組公開狀態，供後台與排程使用（SECURITY INVOKER，受 RLS 限制）
-- get_*_weekly_ranking：前台專用（SECURITY DEFINER），模組公開時才回傳資料
-- 兩者都已排除被隱藏的項目，前台榜單因此會自動遞補
-- -----------------------------------------------------------------------------

-- GitHub：近 7 天新增 star 數 = 最新快照 − 7 天內最早的快照；7 天內建立的 repo 以 0 為基準
-- 快照未滿 7 天時 window_days 小於 7，前台顯示「資料累積中」
create or replace function public.radar_github_ranking(p_limit integer default 25)
returns table (
  item_id uuid,
  title text,
  url text,
  summary text,
  categories text[],
  data jsonb,
  score bigint,
  total bigint,
  window_days integer,
  latest_date date
)
language sql
stable
security invoker
set search_path = ''
as $$
  with latest as (
    select max(snapshots.snapshot_date) as snapshot_date
    from public.radar_metric_snapshots as snapshots
    join public.radar_items as items on items.id = snapshots.item_id
    where items.module_key = 'github'
  ),
  current_items as (
    select items.*, snapshots.value as total, latest.snapshot_date as latest_date
    from latest
    join public.radar_metric_snapshots as snapshots
      on snapshots.snapshot_date = latest.snapshot_date
    join public.radar_items as items on items.id = snapshots.item_id
    where items.module_key = 'github'
      and not items.is_blocked
      and coalesce((items.data ->> 'archived')::boolean, false) = false
      and coalesce((items.data ->> 'is_fork')::boolean, false) = false
      and coalesce((items.data ->> 'is_list')::boolean, false) = false
      and (items.data ->> 'pushed_at')::timestamptz >= now() - interval '30 days'
  ),
  baselines as (
    select distinct on (snapshots.item_id) snapshots.item_id, snapshots.snapshot_date, snapshots.value
    from public.radar_metric_snapshots as snapshots, latest
    where snapshots.item_id in (select current_items.id from current_items)
      and snapshots.snapshot_date >= latest.snapshot_date - 7
      and snapshots.snapshot_date < latest.snapshot_date
    order by snapshots.item_id, snapshots.snapshot_date
  ),
  span as (
    select coalesce(latest.snapshot_date - min(baselines.snapshot_date), 0)::integer as days
    from latest
    left join baselines on true
    group by latest.snapshot_date
  ),
  scored as (
    select
      current_items.*,
      case
        when (current_items.data ->> 'repo_created_at')::timestamptz
          >= ((current_items.latest_date - 7)::timestamp at time zone 'Asia/Taipei')
          then current_items.total
        else current_items.total - baselines.value
      end as delta
    from current_items
    left join baselines on baselines.item_id = current_items.id
  )
  select
    scored.id,
    scored.title,
    scored.url,
    scored.summary,
    scored.categories,
    scored.data,
    scored.delta,
    scored.total,
    span.days,
    scored.latest_date
  from scored, span
  where scored.delta > 0
  order by scored.delta desc, scored.total desc, scored.id
  limit least(greatest(p_limit, 1), 100);
$$;

-- HN：近 7 天發布的 story 依分數排序；p_show_hn 為 true 時只取 Show HN
create or replace function public.radar_hn_ranking(p_show_hn boolean, p_limit integer default 25)
returns table (
  item_id uuid,
  title text,
  url text,
  summary text,
  categories text[],
  data jsonb,
  score bigint,
  total bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    items.id,
    items.title,
    items.url,
    items.summary,
    items.categories,
    items.data,
    coalesce((items.data ->> 'points')::bigint, 0) as score,
    coalesce((items.data ->> 'num_comments')::bigint, 0) as total
  from public.radar_items as items
  where items.module_key = 'hn'
    and not items.is_blocked
    and (items.data ->> 'posted_at')::timestamptz >= now() - interval '7 days'
    and (not p_show_hn or coalesce((items.data ->> 'is_show_hn')::boolean, false))
  order by score desc, total desc, items.id
  limit least(greatest(p_limit, 1), 100);
$$;

-- 前台：公開的模組清單（導覽列、總覽頁與最後同步時間）
create or replace function public.get_public_radar_modules()
returns table (key text, name text, sort_order integer, last_synced_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select modules.key, modules.name, modules.sort_order, modules.last_synced_at
  from public.radar_modules as modules
  where modules.visibility = 'public'
  order by modules.sort_order, modules.key;
$$;

create or replace function public.get_github_weekly_ranking(p_limit integer default 25)
returns table (
  item_id uuid,
  title text,
  url text,
  summary text,
  categories text[],
  data jsonb,
  score bigint,
  total bigint,
  window_days integer,
  latest_date date
)
language sql
stable
security definer
set search_path = ''
as $$
  select ranking.*
  from public.radar_github_ranking(least(greatest(p_limit, 1), 50)) as ranking
  where exists (
    select 1 from public.radar_modules
    where key = 'github' and visibility = 'public'
  );
$$;

create or replace function public.get_hn_weekly_ranking(p_show_hn boolean, p_limit integer default 25)
returns table (
  item_id uuid,
  title text,
  url text,
  summary text,
  categories text[],
  data jsonb,
  score bigint,
  total bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select ranking.*
  from public.radar_hn_ranking(p_show_hn, least(greatest(p_limit, 1), 50)) as ranking
  where exists (
    select 1 from public.radar_modules
    where key = 'hn' and visibility = 'public'
  );
$$;

revoke all on function public.radar_github_ranking(integer) from public;
revoke all on function public.radar_hn_ranking(boolean, integer) from public;
revoke all on function public.get_public_radar_modules() from public;
revoke all on function public.get_github_weekly_ranking(integer) from public;
revoke all on function public.get_hn_weekly_ranking(boolean, integer) from public;

grant execute on function public.radar_github_ranking(integer) to authenticated, service_role;
grant execute on function public.radar_hn_ranking(boolean, integer) to authenticated, service_role;
grant execute on function public.get_public_radar_modules() to anon, authenticated;
grant execute on function public.get_github_weekly_ranking(integer) to anon, authenticated;
grant execute on function public.get_hn_weekly_ranking(boolean, integer) to anon, authenticated;

notify pgrst, 'reload schema';
