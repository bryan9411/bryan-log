-- =============================================================================
-- Bryan Log 資料庫綱要
-- 執行方式：Supabase 後台 → SQL Editor 貼上執行，或 `supabase db reset`
-- 既有資料庫升級：請改執行 supabase/migrations/ 底下對應的遷移檔
-- 安全原則：
--   1. 所有資料表啟用 RLS，匿名訪客僅能讀取「已發布」內容
--   2. 寫入（INSERT / UPDATE / DELETE）僅限已認證用戶（管理員帳號由後台手動建立，請關閉公開註冊）
--   3. 瀏覽數透過 SECURITY DEFINER 函式遞增，匿名訪客無需任何 UPDATE 權限
--   4. 效能指標（web_vitals）匿名僅能經由 record_web_vitals 寫入，讀取限已認證用戶
--   5. 雷達（radar_*）匿名對資料表沒有權限，前台只能透過 get_*_ranking 等 SECURITY DEFINER 函式讀取公開模組；排程以 service role 寫入；收藏（radar_collections）一律私人，前台 RPC 不讀取
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 列舉型別（與 src/lib/constants/content.ts 保持一致）
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'post_status') then
    create type public.post_status as enum ('draft', 'published');
  end if;

  if not exists (select 1 from pg_type where typname = 'category_type') then
    create type public.category_type as enum ('post', 'project');
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- 共用觸發函式：自動維護 updated_at
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 共用觸發函式：發布時自動補上 published_at，退回草稿時清空
-- -----------------------------------------------------------------------------
create or replace function public.sync_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at = now();
  elsif new.status = 'draft' then
    new.published_at = null;
  end if;
  return new;
end;
$$;

-- =============================================================================
-- sections：文章的內容區塊（例如技術文章、旅遊心得），每個區塊有獨立的前台列表頁 /{slug}
-- 保留字與 src/lib/constants/content.ts 的 RESERVED_SECTION_SLUGS 一致，避免蓋過固定路由
-- =============================================================================
create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 30),
  slug text not null unique check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and slug not in ('admin', 'api', 'projects', 'archives', 'preview', 'radar')
  ),
  description text check (char_length(description) <= 300),
  -- 首頁「探索主題」卡片的封面；未設定時前台顯示預設圖
  cover_image_url text check (cover_image_url ~ '^https?://'),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 舊版資料庫補上後來新增的欄位，讓本檔可重複執行完成升級
alter table public.sections
  add column if not exists cover_image_url text check (cover_image_url ~ '^https?://');

-- 舊版資料庫的保留字只有前三個，重建 check constraint 補齊（若已有代稱為 radar 的區塊會失敗，需先改代稱）
alter table public.sections drop constraint if exists sections_slug_check;
alter table public.sections add constraint sections_slug_check check (
  slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  and slug not in ('admin', 'api', 'projects', 'archives', 'preview', 'radar')
);

-- 防呆：區塊名稱不分大小寫不可重複
create unique index if not exists sections_name_key on public.sections (lower(name));
create index if not exists sections_sort_idx on public.sections (sort_order);

drop trigger if exists sections_set_updated_at on public.sections;
create trigger sections_set_updated_at
  before update on public.sections
  for each row execute function public.set_updated_at();

-- 預設區塊：沿用原本的 /posts 網址
insert into public.sections (name, slug, description, sort_order)
values ('技術文章', 'posts', '前端工程、全端架構與資安實踐的技術筆記。', 0)
on conflict (slug) do nothing;

-- =============================================================================
-- categories：雙層分類（父分類 parent_id 為 null，子分類指向父分類）
-- 文章分類（type = 'post'）必須隸屬某個內容區塊；作品分類（type = 'project'）不屬於任何區塊
-- =============================================================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories (id) on delete restrict,
  type public.category_type not null,
  section_id uuid references public.sections (id) on delete restrict,
  name text not null check (char_length(name) between 1 and 50),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text check (char_length(description) <= 300),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_not_self_parent check (parent_id is null or parent_id <> id),
  constraint categories_section_matches_type check ((type = 'post') = (section_id is not null))
);

create index if not exists categories_parent_id_idx on public.categories (parent_id);
create index if not exists categories_type_sort_idx on public.categories (type, sort_order);
create index if not exists categories_section_id_idx on public.categories (section_id);

-- 防呆：網址代稱在同一個區塊（或作品集）內不可重複，前台篩選以 ?category=代稱 定位分類
-- 作品分類的 section_id 為 null，以全零 uuid 代入，讓 null 也參與唯一性比較
create unique index if not exists categories_scope_slug_key on public.categories (
  type,
  coalesce(section_id, '00000000-0000-0000-0000-000000000000'::uuid),
  slug
);

-- 防呆：同一層的兄弟分類名稱不分大小寫不可重複；不同父分類底下可以有同名子分類
create unique index if not exists categories_sibling_name_key on public.categories (
  type,
  coalesce(section_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
  lower(name)
);

-- 防呆：限制最多兩層，子分類必須與父分類同類型、同區塊；建立後不可搬到其他區塊
create or replace function public.enforce_category_hierarchy()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_record record;
begin
  if tg_op = 'UPDATE' and new.section_id is distinct from old.section_id then
    raise exception '分類建立後不可變更所屬區塊';
  end if;

  if new.parent_id is null then
    return new;
  end if;

  select parent_id, type, section_id into parent_record
  from public.categories
  where id = new.parent_id;

  if parent_record.parent_id is not null then
    raise exception '分類最多僅支援兩層，父分類不可再隸屬其他分類';
  end if;

  if parent_record.type <> new.type then
    raise exception '子分類的類型必須與父分類相同';
  end if;

  if parent_record.section_id is distinct from new.section_id then
    raise exception '子分類必須與父分類屬於同一個區塊';
  end if;

  if exists (select 1 from public.categories where parent_id = new.id) then
    raise exception '此分類底下已有子分類，無法再設定為子分類';
  end if;

  return new;
end;
$$;

drop trigger if exists categories_enforce_hierarchy on public.categories;
create trigger categories_enforce_hierarchy
  before insert or update of parent_id, type, section_id on public.categories
  for each row execute function public.enforce_category_hierarchy();

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- 防呆：作品只能掛在作品類型的分類下（文章另有 enforce_post_category 檢查區塊）
create or replace function public.enforce_category_type()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  expected_type public.category_type := tg_argv[0]::public.category_type;
begin
  if new.category_id is null then
    return new;
  end if;

  if not exists (
    select 1 from public.categories
    where id = new.category_id and type = expected_type
  ) then
    raise exception '分類類型不符，必須選擇「%」類型的分類', expected_type;
  end if;

  return new;
end;
$$;

-- =============================================================================
-- posts：文章（content_json 供編輯器回填、content_html 供前台 SSR 直出）
-- 每篇文章必須隸屬一個內容區塊；網址為 /{區塊代稱}/{文章代稱}，文章代稱全站唯一
-- =============================================================================
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users (id) on delete set null default auth.uid(),
  section_id uuid not null references public.sections (id) on delete restrict,
  category_id uuid references public.categories (id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  excerpt text check (char_length(excerpt) <= 300),
  cover_image_url text check (cover_image_url ~ '^https?://'),
  content_json jsonb not null default '{"type": "doc", "content": []}'::jsonb,
  content_html text not null default '',
  status public.post_status not null default 'draft',
  reading_time_minutes integer not null default 1 check (reading_time_minutes >= 1),
  view_count bigint not null default 0 check (view_count >= 0),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_content_json_is_doc check (content_json ->> 'type' = 'doc'),
  constraint posts_published_has_date check (status = 'draft' or published_at is not null)
);

-- TL;DR 核心速讀：文章頂部的重點摘要（每點一句，最多 5 點），供讀者速讀與 AI 搜尋引用
-- 以 add column if not exists 撰寫，既有資料庫可直接重複執行本檔完成升級
alter table public.posts
  add column if not exists tldr text[] not null default '{}';

alter table public.posts drop constraint if exists posts_tldr_max_items;
alter table public.posts
  add constraint posts_tldr_max_items check (cardinality(tldr) <= 5);

create index if not exists posts_status_published_at_idx
  on public.posts (status, published_at desc);
create index if not exists posts_category_id_idx on public.posts (category_id);
create index if not exists posts_section_published_at_idx
  on public.posts (section_id, status, published_at desc);

-- 防呆：文章的分類必須是文章類型，且與文章屬於同一個區塊
create or replace function public.enforce_post_category()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.category_id is null then
    return new;
  end if;

  if not exists (
    select 1 from public.categories
    where id = new.category_id and type = 'post' and section_id = new.section_id
  ) then
    raise exception '分類必須屬於文章所在的區塊，請重新選擇分類';
  end if;

  return new;
end;
$$;

drop trigger if exists posts_sync_published_at on public.posts;
create trigger posts_sync_published_at
  before insert or update of status on public.posts
  for each row execute function public.sync_published_at();

drop trigger if exists posts_enforce_category_type on public.posts;
drop trigger if exists posts_enforce_category on public.posts;
create trigger posts_enforce_category
  before insert or update of category_id, section_id on public.posts
  for each row execute function public.enforce_post_category();

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- =============================================================================
-- projects：作品集
-- =============================================================================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  summary text not null check (char_length(summary) between 1 and 300),
  description_html text not null default '',
  cover_image_url text check (cover_image_url ~ '^https?://'),
  demo_url text check (demo_url ~ '^https?://'),
  repo_url text check (repo_url ~ '^https?://'),
  tech_stack text[] not null default '{}' check (cardinality(tech_stack) <= 20),
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  status public.post_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_published_has_date check (status = 'draft' or published_at is not null)
);

create index if not exists projects_status_sort_idx on public.projects (status, sort_order);
create index if not exists projects_featured_idx
  on public.projects (sort_order) where is_featured and status = 'published';
create index if not exists projects_category_id_idx on public.projects (category_id);
create index if not exists projects_tech_stack_idx on public.projects using gin (tech_stack);

drop trigger if exists projects_sync_published_at on public.projects;
create trigger projects_sync_published_at
  before insert or update of status on public.projects
  for each row execute function public.sync_published_at();

drop trigger if exists projects_enforce_category_type on public.projects;
create trigger projects_enforce_category_type
  before insert or update of category_id on public.projects
  for each row execute function public.enforce_category_type('project');

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 瀏覽數遞增：以 SECURITY DEFINER 執行，只允許對已發布文章 +1
-- =============================================================================
create or replace function public.increment_post_view(target_slug text)
returns bigint
language sql
security definer
set search_path = ''
as $$
  update public.posts
  set view_count = view_count + 1
  where slug = target_slug
    and status = 'published'
    and published_at <= now()
  returning view_count;
$$;

revoke all on function public.increment_post_view(text) from public;
grant execute on function public.increment_post_view(text) to anon, authenticated;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.sections enable row level security;
alter table public.categories enable row level security;
alter table public.posts enable row level security;
alter table public.projects enable row level security;

-- 縱深防禦：即使政策設定失誤，匿名角色在權限層也無法寫入
revoke insert, update, delete, truncate
  on public.sections, public.categories, public.posts, public.projects from anon;
grant select on public.sections, public.categories, public.posts, public.projects to anon;
grant select, insert, update, delete
  on public.sections, public.categories, public.posts, public.projects to authenticated;

-- sections：區塊為公開資訊，所有人可讀；僅認證用戶可寫
drop policy if exists "sections_select_public" on public.sections;
create policy "sections_select_public" on public.sections
  for select to anon, authenticated
  using (true);

drop policy if exists "sections_insert_authenticated" on public.sections;
create policy "sections_insert_authenticated" on public.sections
  for insert to authenticated
  with check (true);

drop policy if exists "sections_update_authenticated" on public.sections;
create policy "sections_update_authenticated" on public.sections
  for update to authenticated
  using (true) with check (true);

drop policy if exists "sections_delete_authenticated" on public.sections;
create policy "sections_delete_authenticated" on public.sections
  for delete to authenticated
  using (true);

-- categories：分類為公開資訊，所有人可讀；僅認證用戶可寫
drop policy if exists "categories_select_public" on public.categories;
create policy "categories_select_public" on public.categories
  for select to anon, authenticated
  using (true);

drop policy if exists "categories_insert_authenticated" on public.categories;
create policy "categories_insert_authenticated" on public.categories
  for insert to authenticated
  with check (true);

drop policy if exists "categories_update_authenticated" on public.categories;
create policy "categories_update_authenticated" on public.categories
  for update to authenticated
  using (true) with check (true);

drop policy if exists "categories_delete_authenticated" on public.categories;
create policy "categories_delete_authenticated" on public.categories
  for delete to authenticated
  using (true);

-- posts：匿名訪客僅可讀取已發布且發布時間已到的文章；認證用戶可讀寫全部（含草稿）
drop policy if exists "posts_select_published" on public.posts;
create policy "posts_select_published" on public.posts
  for select to anon
  using (status = 'published' and published_at <= now());

drop policy if exists "posts_select_authenticated" on public.posts;
create policy "posts_select_authenticated" on public.posts
  for select to authenticated
  using (true);

drop policy if exists "posts_insert_authenticated" on public.posts;
create policy "posts_insert_authenticated" on public.posts
  for insert to authenticated
  with check (true);

drop policy if exists "posts_update_authenticated" on public.posts;
create policy "posts_update_authenticated" on public.posts
  for update to authenticated
  using (true) with check (true);

drop policy if exists "posts_delete_authenticated" on public.posts;
create policy "posts_delete_authenticated" on public.posts
  for delete to authenticated
  using (true);

-- projects：規則同 posts
drop policy if exists "projects_select_published" on public.projects;
create policy "projects_select_published" on public.projects
  for select to anon
  using (status = 'published' and published_at <= now());

drop policy if exists "projects_select_authenticated" on public.projects;
create policy "projects_select_authenticated" on public.projects
  for select to authenticated
  using (true);

drop policy if exists "projects_insert_authenticated" on public.projects;
create policy "projects_insert_authenticated" on public.projects
  for insert to authenticated
  with check (true);

drop policy if exists "projects_update_authenticated" on public.projects;
create policy "projects_update_authenticated" on public.projects
  for update to authenticated
  using (true) with check (true);

drop policy if exists "projects_delete_authenticated" on public.projects;
create policy "projects_delete_authenticated" on public.projects
  for delete to authenticated
  using (true);

-- =============================================================================
-- Storage：media 公開儲存桶（文章圖片、作品預覽圖）
-- 公開讀取走 /storage/v1/object/public/media/...；列舉、上傳、刪除僅限認證用戶
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  5242880, -- 5 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media_select_authenticated" on storage.objects;
create policy "media_select_authenticated" on storage.objects
  for select to authenticated
  using (bucket_id = 'media');

drop policy if exists "media_insert_authenticated" on storage.objects;
create policy "media_insert_authenticated" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media');

drop policy if exists "media_update_authenticated" on storage.objects;
create policy "media_update_authenticated" on storage.objects
  for update to authenticated
  using (bucket_id = 'media') with check (bucket_id = 'media');

drop policy if exists "media_delete_authenticated" on storage.objects;
create policy "media_delete_authenticated" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media');

-- =============================================================================
-- web_vitals：前台真實訪客的 Core Web Vitals 量測值，供後台儀表板彙總分析
-- 寫入僅能透過 record_web_vitals（SECURITY DEFINER），匿名角色對資料表沒有任何權限；
-- 讀取與彙總限已認證用戶。以 if not exists / or replace 撰寫，既有資料庫可直接重複執行本檔完成升級
-- =============================================================================
create table if not exists public.web_vitals (
  id bigint generated always as identity primary key,
  metric text not null check (metric in ('LCP', 'INP', 'CLS', 'FCP', 'TTFB')),
  value double precision not null check (value >= 0 and value <= 600000),
  rating text not null check (rating in ('good', 'needs-improvement', 'poor')),
  path text not null check (char_length(path) between 1 and 200 and path like '/%'),
  device text not null check (device in ('mobile', 'desktop')),
  created_at timestamptz not null default now()
);

create index if not exists web_vitals_created_at_idx on public.web_vitals (created_at desc);
create index if not exists web_vitals_metric_created_at_idx
  on public.web_vitals (metric, created_at desc);

alter table public.web_vitals enable row level security;

revoke all on public.web_vitals from anon;
grant select, delete on public.web_vitals to authenticated;

drop policy if exists "web_vitals_select_authenticated" on public.web_vitals;
create policy "web_vitals_select_authenticated" on public.web_vitals
  for select to authenticated
  using (true);

drop policy if exists "web_vitals_delete_authenticated" on public.web_vitals;
create policy "web_vitals_delete_authenticated" on public.web_vitals
  for delete to authenticated
  using (true);

-- 一次寫入同一頁面的多筆指標（最多 10 筆）；欄位格式由資料表 check 限制把關。
-- 順帶刪除超過 90 天的舊資料，資料量維持在可控範圍（依 created_at 索引，無舊資料時幾乎不耗成本）
create or replace function public.record_web_vitals(entries jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.web_vitals (metric, value, rating, path, device)
  select entry.metric, entry.value, entry.rating, entry.path, entry.device
  from jsonb_to_recordset(entries) as entry (
    metric text,
    value double precision,
    rating text,
    path text,
    device text
  )
  limit 10;

  delete from public.web_vitals where created_at < now() - interval '90 days';
$$;

revoke all on function public.record_web_vitals(jsonb) from public;
grant execute on function public.record_web_vitals(jsonb) to anon, authenticated;

-- 以下彙總函式以呼叫者身分執行（SECURITY INVOKER），受上方 RLS 限制，只有已認證用戶讀得到資料
-- device_filter 為 null 時不分裝置

-- 各指標的第 75 百分位數（Google 評估 Core Web Vitals 的基準）與評級分布
create or replace function public.get_web_vitals_summary(since timestamptz, device_filter text default null)
returns table (
  metric text,
  p75 double precision,
  samples bigint,
  good bigint,
  needs_improvement bigint,
  poor bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    vitals.metric,
    percentile_cont(0.75) within group (order by vitals.value),
    count(*),
    count(*) filter (where vitals.rating = 'good'),
    count(*) filter (where vitals.rating = 'needs-improvement'),
    count(*) filter (where vitals.rating = 'poor')
  from public.web_vitals as vitals
  where vitals.created_at >= since
    and (device_filter is null or vitals.device = device_filter)
  group by vitals.metric;
$$;

-- 每日（台北時間）各指標的 p75，供趨勢圖使用
create or replace function public.get_web_vitals_daily(since timestamptz, device_filter text default null)
returns table (day date, metric text, p75 double precision, samples bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    (vitals.created_at at time zone 'Asia/Taipei')::date as day,
    vitals.metric,
    percentile_cont(0.75) within group (order by vitals.value),
    count(*)
  from public.web_vitals as vitals
  where vitals.created_at >= since
    and (device_filter is null or vitals.device = device_filter)
  group by day, vitals.metric
  order by day;
$$;

-- 各頁面的三項核心指標 p75；以 TTFB 筆數代表載入次數（每次完整載入必定回報），依流量排序
create or replace function public.get_web_vitals_pages(
  since timestamptz,
  device_filter text default null,
  page_limit integer default 10
)
returns table (
  path text,
  page_loads bigint,
  lcp_p75 double precision,
  inp_p75 double precision,
  cls_p75 double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    vitals.path,
    count(*) filter (where vitals.metric = 'TTFB') as page_loads,
    percentile_cont(0.75) within group (order by vitals.value) filter (where vitals.metric = 'LCP'),
    percentile_cont(0.75) within group (order by vitals.value) filter (where vitals.metric = 'INP'),
    percentile_cont(0.75) within group (order by vitals.value) filter (where vitals.metric = 'CLS')
  from public.web_vitals as vitals
  where vitals.created_at >= since
    and (device_filter is null or vitals.device = device_filter)
  group by vitals.path
  order by page_loads desc, vitals.path
  limit least(greatest(page_limit, 1), 50);
$$;

revoke all on function public.get_web_vitals_summary(timestamptz, text) from public;
revoke all on function public.get_web_vitals_daily(timestamptz, text) from public;
revoke all on function public.get_web_vitals_pages(timestamptz, text, integer) from public;
grant execute on function public.get_web_vitals_summary(timestamptz, text) to authenticated;
grant execute on function public.get_web_vitals_daily(timestamptz, text) to authenticated;
grant execute on function public.get_web_vitals_pages(timestamptz, text, integer) to authenticated;

-- =============================================================================
-- 雷達：情報榜單模組（GitHub 週榜、HN 週榜…）
-- radar_modules 為模組設定與同步狀態；radar_items 為跨模組通用的項目主檔；
-- radar_metric_snapshots 為每日指標快照（GitHub 為 star 數），保留 35 天
-- =============================================================================
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
  -- 手動隱藏時為 null；被排除關鍵字隱藏時記錄規則與原因（刻意不設外鍵，規則刪除後由應用程式還原）
  blocked_reason text,
  blocked_rule_id uuid,
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
values ('github', 'GitHub 週榜', 0), ('hn', 'Hacker News 週榜', 1), ('security', '資安情資', 2)
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

-- =============================================================================
-- 雷達第二期：資安情資（security 模組）與關鍵字規則
-- =============================================================================
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

-- =============================================================================
-- 雷達第三期：收藏工作台（雙層快照收藏、研究狀態／筆記／標籤）
-- 收藏一律私人：匿名對收藏表沒有任何權限，前台 RPC 也不讀這張表
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
