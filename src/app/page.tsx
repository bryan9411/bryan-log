import { ThemeToggle } from "@/components/layout/theme-toggle"
import { siteConfig } from "@/config/site"

// 階段一佔位首頁：驗證主題切換與繁中排版，階段四將替換為完整品牌首頁
export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6">
      <header className="flex h-16 items-center justify-between">
        <span className="font-semibold tracking-tight">{siteConfig.name}</span>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col justify-center gap-4 py-24">
        <p className="text-sm text-muted-foreground">網站建置中</p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance">{siteConfig.title}</h1>
        <p className="max-w-xl leading-relaxed text-pretty text-muted-foreground">
          {siteConfig.description}
        </p>
      </main>
    </div>
  )
}
