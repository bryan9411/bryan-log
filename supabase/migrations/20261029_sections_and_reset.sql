-- =============================================================================
-- 遷移：清除種子資料 + 新增內容區塊（sections）+ 分類名稱防呆
-- 適用：已執行過舊版 supabase_schema.sql 的資料庫（例如正式環境）
-- 執行方式：Supabase 後台 → SQL Editor 貼上整份執行；全部包在同一個交易內，任一步失敗會整批還原
--
-- ⚠️ 第一步會「永久刪除」所有文章、作品與分類，執行前請確認沒有需要保留的資料
--    Storage 中已上傳的圖片不會被刪除，可於後台「空間清理」掃描並移除未被引用的檔案
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. 清除所有內容（種子資料）
-- -----------------------------------------------------------------------------
truncate table public.posts, public.projects, public.categories;

-- -----------------------------------------------------------------------------
-- 2. sections：文章的內容區塊
-- -----------------------------------------------------------------------------
create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 30),
  slug text not null unique check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and slug not in ('admin', 'api', 'projects')
  ),
  description text check (char_length(description) <= 300),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists sections_name_key on public.sections (lower(name));
create index if not exists sections_sort_idx on public.sections (sort_order);

drop trigger if exists sections_set_updated_at on public.sections;
create trigger sections_set_updated_at
  before update on public.sections
  for each row execute function public.set_updated_at();

insert into public.sections (name, slug, description, sort_order)
values ('技術文章', 'posts', '前端工程、全端架構與資安實踐的技術筆記。', 0)
on conflict (slug) do nothing;

alter table public.sections enable row level security;
revoke insert, update, delete, truncate on public.sections from anon;
grant select on public.sections to anon;
grant select, insert, update, delete on public.sections to authenticated;

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

-- -----------------------------------------------------------------------------
-- 3. categories：文章分類隸屬區塊，網址代稱與名稱的唯一性改為依區塊／同層判斷
-- -----------------------------------------------------------------------------
alter table public.categories
  add column if not exists section_id uuid references public.sections (id) on delete restrict;

alter table public.categories drop constraint if exists categories_type_slug_key;
alter table public.categories drop constraint if exists categories_section_matches_type;
alter table public.categories
  add constraint categories_section_matches_type check ((type = 'post') = (section_id is not null));

create index if not exists categories_section_id_idx on public.categories (section_id);

create unique index if not exists categories_scope_slug_key on public.categories (
  type,
  coalesce(section_id, '00000000-0000-0000-0000-000000000000'::uuid),
  slug
);

create unique index if not exists categories_sibling_name_key on public.categories (
  type,
  coalesce(section_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
  lower(name)
);

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

-- -----------------------------------------------------------------------------
-- 4. posts：每篇文章隸屬一個區塊，分類必須與文章同區塊
-- -----------------------------------------------------------------------------
alter table public.posts
  add column if not exists section_id uuid not null references public.sections (id) on delete restrict;

create index if not exists posts_section_published_at_idx
  on public.posts (section_id, status, published_at desc);

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

drop trigger if exists posts_enforce_category_type on public.posts;
drop trigger if exists posts_enforce_category on public.posts;
create trigger posts_enforce_category
  before insert or update of category_id, section_id on public.posts
  for each row execute function public.enforce_post_category();

commit;
