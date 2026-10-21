import { NotFoundContent } from "@/components/site/not-found-content"
import { SiteFooter } from "@/components/site/site-footer"
import { SiteHeader } from "@/components/site/site-header"

// 不符合任何路由的網址由根層級處理，不會經過 (site) 版型，因此自行補上頁首與頁尾
export default function NotFound() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <NotFoundContent />
      </main>
      <SiteFooter />
    </div>
  )
}
