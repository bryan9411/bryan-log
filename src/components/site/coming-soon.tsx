import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { SiteContainer } from "@/components/site/site-container"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/config/routes"

type ComingSoonProps = {
  title: string
  description: string
}

// 導覽列已連結但尚未完成的頁面，避免訪客點擊後看到 404
export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <SiteContainer className="flex flex-1 flex-col items-start justify-center gap-4 py-24">
      <p className="text-sm text-muted-foreground">頁面建置中</p>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-xl leading-relaxed text-pretty text-muted-foreground">{description}</p>
      <Button asChild variant="outline" className="mt-2">
        <Link href={ROUTES.HOME}>
          <ArrowLeftIcon data-icon="inline-start" aria-hidden />
          回首頁
        </Link>
      </Button>
    </SiteContainer>
  )
}
