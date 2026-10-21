import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type StatCardProps = {
  label: string
  value: string | number
  hint?: string
}

export function StatCard({ label, value, hint }: StatCardProps) {
  const maybeRenderHint = () => {
    if (!hint) return null
    return <p className="text-xs text-muted-foreground">{hint}</p>
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent>{maybeRenderHint()}</CardContent>
    </Card>
  )
}

export function StatCardSkeleton() {
  return <Skeleton className="h-32 rounded-xl" />
}
