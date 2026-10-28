import Link from "next/link"

import { SiteContainer } from "@/components/site/site-container"
import { Button } from "@/components/ui/button"
import { ROUTES, sectionPath } from "@/config/routes"
import { getSections } from "@/lib/data/sections"

export async function NotFoundContent() {
  const [primarySection] = await getSections()

  const maybeRenderSectionLink = () => {
    if (!primarySection) return null

    return (
      <Button asChild variant="outline">
        <Link href={sectionPath(primarySection.slug)}>瀏覽{primarySection.name}</Link>
      </Button>
    )
  }

  return (
    <SiteContainer className="flex flex-1 flex-col items-start justify-center gap-4 py-24">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">找不到這個頁面</h1>
      <p className="max-w-xl leading-relaxed text-pretty text-muted-foreground">
        網址可能有誤，或內容已經下架。可以回到首頁，或從文章列表重新找起。
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        <Button asChild>
          <Link href={ROUTES.HOME}>回首頁</Link>
        </Button>
        {maybeRenderSectionLink()}
      </div>
    </SiteContainer>
  )
}
