-- 累加閱讀數時直接回傳新數字，前台不必累加後再查一次
-- 回傳型別改變無法用 create or replace，需先移除舊函式
drop function if exists public.increment_post_view(text);

create function public.increment_post_view(target_slug text)
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

notify pgrst, 'reload schema';
