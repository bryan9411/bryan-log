import type { LucideIcon } from "lucide-react"
import { CircleAlertIcon, CircleCheckIcon, CircleXIcon } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  CHECK_STATUS,
  CHECK_STATUS_LABEL,
  type CheckStatus,
  type ContentCheck,
} from "@/lib/content/content-check"
import { cn } from "@/lib/utils"

const STATUS_ICON: Record<CheckStatus, LucideIcon> = {
  [CHECK_STATUS.PASS]: CircleCheckIcon,
  [CHECK_STATUS.WARN]: CircleAlertIcon,
  [CHECK_STATUS.FAIL]: CircleXIcon,
}

const STATUS_CLASS: Record<CheckStatus, string> = {
  [CHECK_STATUS.PASS]: "text-emerald-600 dark:text-emerald-400",
  [CHECK_STATUS.WARN]: "text-amber-600 dark:text-amber-400",
  [CHECK_STATUS.FAIL]: "text-destructive",
}

type ContentChecklistProps = {
  title: string
  icon: LucideIcon
  checks: ContentCheck[]
}

// SEO 與 GEO 健檢共用的結果卡片：每項以圖示、狀態文字與建議說明呈現，不只靠顏色辨識
export function ContentChecklist({ title, icon: Icon, checks }: ContentChecklistProps) {
  const passedCount = checks.filter((check) => check.status === CHECK_STATUS.PASS).length

  const renderCheck = (check: ContentCheck) => {
    const StatusIcon = STATUS_ICON[check.status]

    return (
      <li key={check.id} className="flex gap-2.5">
        <StatusIcon
          className={cn("mt-0.5 size-4 shrink-0", STATUS_CLASS[check.status])}
          aria-hidden
        />
        <div className="grid min-w-0 gap-0.5">
          <p className="text-sm font-medium">
            {check.label}
            <span className="sr-only">：{CHECK_STATUS_LABEL[check.status]}</span>
          </p>
          <p className="text-xs text-pretty text-muted-foreground">{check.message}</p>
        </div>
      </li>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4" aria-hidden />
          {title}
        </CardTitle>
        <CardDescription>
          {passedCount} / {checks.length} 項通過
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="mb-4 flex h-1.5 gap-0.5 overflow-hidden rounded-full"
          role="img"
          aria-label={`${title}通過 ${passedCount} / ${checks.length} 項`}
        >
          {checks.map((check) => (
            <span
              key={check.id}
              className={cn(
                "flex-1 first:rounded-l-full last:rounded-r-full",
                check.status === CHECK_STATUS.PASS ? "bg-emerald-500" : "bg-muted",
              )}
            />
          ))}
        </div>
        <ul className="grid gap-3" aria-live="polite">
          {checks.map(renderCheck)}
        </ul>
      </CardContent>
    </Card>
  )
}
