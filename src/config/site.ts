// 站點個人資訊由環境變數提供（參考 .env.example），未設定時使用以下預設值
// NEXT_PUBLIC_ 變數必須以完整名稱靜態存取，Next.js 才能在建置時內嵌到瀏覽器端
const DEFAULT_AUTHOR = "Bryan"
const DEFAULT_GITHUB_URL = "https://github.com/your-github"
const DEFAULT_HERO_HEADLINE = "把複雜的系統，拆解成清楚的程式碼與文字"

// 空字串視為未設定，避免 .env 中留空的欄位讓頁面出現空白
const readEnv = (value: string | undefined, fallback: string) => value?.trim() || fallback

export const siteConfig = {
  name: "Bryan Log",
  author: readEnv(process.env.NEXT_PUBLIC_SITE_AUTHOR, DEFAULT_AUTHOR),
  githubUrl: readEnv(process.env.NEXT_PUBLIC_GITHUB_URL, DEFAULT_GITHUB_URL),
  title: "Bryan Log｜技術文章與作品集",
  description: "記錄前端工程、全端架構與資安實踐的技術部落格，並展示個人精選專案。",
  locale: "zh-TW",
  // Open Graph 使用底線格式的地區代碼
  ogLocale: "zh_TW",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  launchYear: 2026,
  hero: {
    eyebrow: "全端工程師・技術寫作者",
    headline: readEnv(process.env.NEXT_PUBLIC_HERO_HEADLINE, DEFAULT_HERO_HEADLINE),
    intro:
      "我專注於 Next.js 與 TypeScript 的全端開發，重視效能、可維護性與資訊安全。在這裡分享實戰踩過的坑、架構取捨，以及親手打造的作品。",
    skills: [
      "Next.js",
      "React",
      "TypeScript",
      "Node.js",
      "PostgreSQL",
      "Supabase",
      "Tailwind CSS",
      "Web 資安",
    ],
  },
} as const
