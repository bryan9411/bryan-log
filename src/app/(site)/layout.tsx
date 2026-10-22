import { WebVitalsReporter } from "@/components/analytics/web-vitals-reporter"
import { SiteFooter } from "@/components/site/site-footer"
import { SiteHeader } from "@/components/site/site-header"

// 前台共用版型：頁首與頁尾皆為靜態外殼，頁面中的資料區塊各自以 Suspense 串流
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="site-theme flex min-h-full flex-1 flex-col bg-background text-foreground selection:bg-[#c25b3f]/20 selection:text-foreground">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-background px-4 py-2 text-sm font-medium shadow focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        跳至主要內容
      </a>
      <SiteHeader />
      <main id="main-content" className="flex flex-1 flex-col">
        {children}
      </main>
      <SiteFooter />
      <WebVitalsReporter />
    </div>
  )
}
