# Bryan Log

個人品牌網站：文章（可自訂內容區塊，例如技術文章、旅遊心得）與作品集。Next.js 16（App Router、React 19、Cache Components）+ Supabase + Tailwind CSS v4 + Shadcn UI。

## 環境需求

- Node.js 22 以上（`nvm use` 會讀取 `.nvmrc`）
- pnpm（版本鎖定於 `package.json` 的 `packageManager`，建議執行 `corepack enable` 自動切換）

## 快速開始

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

## 資料庫初始化

1. 全新的資料庫：在 Supabase 後台的 SQL Editor 執行 `supabase/supabase_schema.sql`（會建立預設區塊「技術文章」，網址 `/posts`）
2. 已建立過的資料庫：依日期順序執行 `supabase/migrations/` 中尚未執行過的遷移檔
3. 到 Authentication → Sign In / Providers 關閉「Allow new users to sign up」，並手動建立管理員帳號

文章、分類與內容區塊都從後台建立，專案不附種子資料。

## 常用指令

| 指令                | 說明                       |
| ------------------- | -------------------------- |
| `pnpm dev`          | 啟動開發伺服器             |
| `pnpm build`        | 正式環境建置               |
| `pnpm typecheck`    | 產生路由型別並執行型別檢查 |
| `pnpm lint`         | ESLint 檢查                |
| `pnpm format`       | Prettier 格式化（無分號）  |
| `pnpm format:check` | 檢查格式是否符合規範       |
