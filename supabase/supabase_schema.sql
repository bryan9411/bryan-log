-- =============================================================================
-- Bryan Log 資料庫綱要
-- 執行方式：Supabase 後台 → SQL Editor 貼上執行，或 `supabase db reset`
-- 安全原則：
--   1. 所有資料表啟用 RLS，匿名訪客僅能讀取「已發布」內容
--   2. 寫入（INSERT / UPDATE / DELETE）僅限已認證用戶（管理員帳號由後台手動建立，請關閉公開註冊）
--   3. 瀏覽數透過 SECURITY DEFINER 函式遞增，匿名訪客無需任何 UPDATE 權限
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
-- categories：雙層分類（父分類 parent_id 為 null，子分類指向父分類）
-- =============================================================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories (id) on delete restrict,
  type public.category_type not null,
  name text not null check (char_length(name) between 1 and 50),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text check (char_length(description) <= 300),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_type_slug_key unique (type, slug),
  constraint categories_not_self_parent check (parent_id is null or parent_id <> id)
);

create index if not exists categories_parent_id_idx on public.categories (parent_id);
create index if not exists categories_type_sort_idx on public.categories (type, sort_order);

-- 防呆：限制最多兩層，且子分類必須與父分類同類型
create or replace function public.enforce_category_hierarchy()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_record record;
begin
  if new.parent_id is null then
    return new;
  end if;

  select parent_id, type into parent_record
  from public.categories
  where id = new.parent_id;

  if parent_record.parent_id is not null then
    raise exception '分類最多僅支援兩層，父分類不可再隸屬其他分類';
  end if;

  if parent_record.type <> new.type then
    raise exception '子分類的類型必須與父分類相同';
  end if;

  if exists (select 1 from public.categories where parent_id = new.id) then
    raise exception '此分類底下已有子分類，無法再設定為子分類';
  end if;

  return new;
end;
$$;

drop trigger if exists categories_enforce_hierarchy on public.categories;
create trigger categories_enforce_hierarchy
  before insert or update of parent_id, type on public.categories
  for each row execute function public.enforce_category_hierarchy();

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- 防呆：文章與作品只能掛在對應類型的分類下
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
-- posts：技術文章（content_json 供編輯器回填、content_html 供前台 SSR 直出）
-- =============================================================================
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users (id) on delete set null default auth.uid(),
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

create index if not exists posts_status_published_at_idx
  on public.posts (status, published_at desc);
create index if not exists posts_category_id_idx on public.posts (category_id);

drop trigger if exists posts_sync_published_at on public.posts;
create trigger posts_sync_published_at
  before insert or update of status on public.posts
  for each row execute function public.sync_published_at();

drop trigger if exists posts_enforce_category_type on public.posts;
create trigger posts_enforce_category_type
  before insert or update of category_id on public.posts
  for each row execute function public.enforce_category_type('post');

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
returns void
language sql
security definer
set search_path = ''
as $$
  update public.posts
  set view_count = view_count + 1
  where slug = target_slug
    and status = 'published'
    and published_at <= now();
$$;

revoke all on function public.increment_post_view(text) from public;
grant execute on function public.increment_post_view(text) to anon, authenticated;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.categories enable row level security;
alter table public.posts enable row level security;
alter table public.projects enable row level security;

-- 縱深防禦：即使政策設定失誤，匿名角色在權限層也無法寫入
revoke insert, update, delete, truncate on public.categories, public.posts, public.projects from anon;
grant select on public.categories, public.posts, public.projects to anon;
grant select, insert, update, delete on public.categories, public.posts, public.projects to authenticated;

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
