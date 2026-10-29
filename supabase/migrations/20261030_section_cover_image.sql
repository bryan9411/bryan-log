-- =============================================================================
-- 遷移：內容區塊新增封面圖片（首頁「探索主題」卡片使用；未設定時前台顯示預設圖）
-- 適用：已執行過 20261029_sections_and_reset.sql 的資料庫（例如正式環境）
-- 執行方式：Supabase 後台 → SQL Editor 貼上整份執行；可重複執行
--
-- ⚠️ 請在部署新版程式碼「之前」執行：新版前台會讀取 sections.cover_image_url，欄位不存在時整站會讀取失敗
-- =============================================================================

alter table public.sections
  add column if not exists cover_image_url text check (cover_image_url ~ '^https?://');
