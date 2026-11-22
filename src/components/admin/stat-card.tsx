import Link from "next/link"
import type { Route } from "next"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type StatCardProps = {
  label: string
  value: string | number
  hint?: string
  // 有值時整張卡片可點擊，例如進入列表的對應分頁
  href?: Route
}

export function StatCard({ label, value, hint, href }: StatCardProps) {
  const maybeRenderHint = () => {
    if (!hint) return null
    return <p className="text-xs text-muted-foreground">{hint}</p>
  }

  const card = (
    <Card className={href ? "h-full transition-colors group-hover:bg-muted" : undefined}>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent>{maybeRenderHint()}</CardContent>
    </Card>
  )

  if (!href) return card

  return (
    <Link
      href={href}
      className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {card}
    </Link>
  )
}

export function StatCardSkeleton() {
  return <Skeleton className="h-32 rounded-xl" />
}
