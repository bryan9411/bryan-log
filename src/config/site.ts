export const SOCIAL_PLATFORM = {
  GITHUB: "github",
  LINKEDIN: "linkedin",
} as const

export type SocialPlatform = (typeof SOCIAL_PLATFORM)[keyof typeof SOCIAL_PLATFORM]

export type SocialLink = {
  platform: SocialPlatform
  label: string
  href: string
}

export const siteConfig = {
  name: "Bryan Log",
  author: "Bryan",
  title: "Bryan Log｜技術文章與作品集",
  description: "記錄前端工程、全端架構與資安實踐的技術部落格，並展示個人精選專案。",
  locale: "zh-TW",
  // Open Graph 使用底線格式的地區代碼
  ogLocale: "zh_TW",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  launchYear: 2026,
  hero: {
    eyebrow: "全端工程師・技術寫作者",
    headline: "把複雜的系統，拆解成清楚的程式碼與文字",
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
  // 請替換為自己的社群帳號網址
  socialLinks: [
    { platform: SOCIAL_PLATFORM.GITHUB, label: "GitHub", href: "https://github.com/your-github" },
    {
      platform: SOCIAL_PLATFORM.LINKEDIN,
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/your-linkedin",
    },
  ] satisfies SocialLink[],
} as const
