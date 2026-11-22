-- =============================================================================
-- 雷達模組第二期：資安情資（CISA KEV + EPSS、GitHub Advisory）、關鍵字規則
-- 執行方式：Supabase 後台 → SQL Editor 貼上執行；需先執行 20261123_radar.sql；可重複執行
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 模組：兩個榜單共用公開狀態與同步狀態；一律先隱藏，確認同步正常後再於後台公開
-- -----------------------------------------------------------------------------
insert into public.radar_modules (key, name, sort_order)
values ('security', '資安情資', 2)
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- 隱藏原因：手動隱藏時兩個欄位皆為 null；被排除關鍵字隱藏時記錄規則編號與原因
-- blocked_rule_id 刻意不設外鍵：規則刪除後由應用程式重新套用規則並還原項目，
-- 即使直接在 SQL 刪除規則，下次同步也會自動還原（不會被誤判成手動隱藏）
-- -----------------------------------------------------------------------------
alter table public.radar_items add column if not exists blocked_reason text;
alter table public.radar_items add column if not exists blocked_rule_id uuid;

-- -----------------------------------------------------------------------------
-- 關鍵字規則：exclude 命中即自動隱藏；watch 只在 data.watch_keywords 記錄並顯示徽章，不影響名次
-- 規則表不綁定資安模組，第一期的 GitHub／HN 之後也能使用；keyword 一律以小寫儲存
-- -----------------------------------------------------------------------------
create table if not exists public.radar_keyword_rules (
  id uuid primary key default gen_random_uuid(),
  module_key text not null references public.radar_modules (key) on delete cascade,
  kind text not null check (kind in ('exclude', 'watch')),
  keyword text not null check (char_length(keyword) between 2 and 60),
  created_at timestamptz not null default now(),
  unique (module_key, kind, keyword)
);

alter table public.radar_keyword_rules enable row level security;

revoke all on public.radar_keyword_rules from anon;
grant select, insert, update, delete on public.radar_keyword_rules to authenticated, service_role;

drop policy if exists "radar_keyword_rules_all_authenticated" on public.radar_keyword_rules;
create policy "radar_keyword_rules_all_authenticated" on public.radar_keyword_rules
  for all to authenticated
  using (true) with check (true);

-- -----------------------------------------------------------------------------
-- 排名函式
-- radar_security_*_ranking：不檢查模組公開狀態，供後台使用（SECURITY INVOKER，受 RLS 限制）
-- get_security_*_ranking：前台專用（SECURITY DEFINER），模組公開時才回傳資料
-- 兩者都已排除被隱藏的項目，前台榜單因此會自動遞補
-- -----------------------------------------------------------------------------

-- 實戰遭利用：近 30 天（台灣日期）加入 KEV；勒索軟體利用優先 → EPSS 高到低 → 加入日期新到舊
create or replace function public.radar_security_kev_ranking(p_limit integer default 25)
returns table (
  item_id uuid,
  title text,
  url text,
  summary text,
  categories text[],
  data jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  select items.id, items.title, items.url, items.summary, items.categories, items.data
  from public.radar_items as items
  where items.module_key = 'security'
    and items.data ->> 'source' = 'kev'
    and not items.is_blocked
    and (items.data ->> 'date_added')::date >= (now() at time zone 'Asia/Taipei')::date - 30
  order by
    coalesce((items.data ->> 'ransomware')::boolean, false) desc,
    coalesce((items.data ->> 'epss')::numeric, 0) desc,
    (items.data ->> 'date_added')::date desc,
    items.id
  limit least(greatest(p_limit, 1), 100);
$$;

-- 開發生態漏洞：近 7 天發布；惡意套件與 critical 同級 > high → EPSS → npm 週下載量 → 發布時間新到舊
-- 惡意套件週下載量未達門檻時 below_threshold 為 true（門檻在 src/config/radar.ts），資料只作為查詢快取
create or replace function public.radar_security_advisory_ranking(p_limit integer default 25)
returns table (
  item_id uuid,
  title text,
  url text,
  summary text,
  categories text[],
  data jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  select items.id, items.title, items.url, items.summary, items.categories, items.data
  from public.radar_items as items
  where items.module_key = 'security'
    and items.data ->> 'source' = 'advisory'
    and not items.is_blocked
    and not coalesce((items.data ->> 'below_threshold')::boolean, false)
    and (items.data ->> 'published_at')::timestamptz >= now() - interval '7 days'
  order by
    case
      when items.data ->> 'type' = 'malware' or items.data ->> 'severity' = 'critical' then 2
      when items.data ->> 'severity' = 'high' then 1
      else 0
    end desc,
    coalesce((items.data ->> 'epss')::numeric, 0) desc,
    coalesce((items.data ->> 'npm_weekly_downloads')::bigint, 0) desc,
    (items.data ->> 'published_at')::timestamptz desc,
    items.id
  limit least(greatest(p_limit, 1), 100);
$$;

create or replace function public.get_security_kev_ranking(p_limit integer default 25)
returns table (
  item_id uuid,
  title text,
  url text,
  summary text,
  categories text[],
  data jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select ranking.*
  from public.radar_security_kev_ranking(least(greatest(p_limit, 1), 50)) as ranking
  where exists (
    select 1 from public.radar_modules
    where key = 'security' and visibility = 'public'
  );
$$;

create or replace function public.get_security_advisory_ranking(p_limit integer default 25)
returns table (
  item_id uuid,
  title text,
  url text,
  summary text,
  categories text[],
  data jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select ranking.*
  from public.radar_security_advisory_ranking(least(greatest(p_limit, 1), 50)) as ranking
  where exists (
    select 1 from public.radar_modules
    where key = 'security' and visibility = 'public'
  );
$$;

revoke all on function public.radar_security_kev_ranking(integer) from public;
revoke all on function public.radar_security_advisory_ranking(integer) from public;
revoke all on function public.get_security_kev_ranking(integer) from public;
revoke all on function public.get_security_advisory_ranking(integer) from public;

grant execute on function public.radar_security_kev_ranking(integer) to authenticated, service_role;
grant execute on function public.radar_security_advisory_ranking(integer) to authenticated, service_role;
grant execute on function public.get_security_kev_ranking(integer) to anon, authenticated;
grant execute on function public.get_security_advisory_ranking(integer) to anon, authenticated;

notify pgrst, 'reload schema';
