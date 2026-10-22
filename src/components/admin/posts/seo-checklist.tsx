"use client"

import { useDeferredValue, useMemo } from "react"
import { CircleAlertIcon, CircleCheckIcon, CircleXIcon, SearchCheckIcon } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  runSeoChecks,
  SEO_CHECK_STATUS,
  SEO_CHECK_STATUS_LABEL,
  type SeoCheck,
  type SeoCheckInput,
  type SeoCheckStatus,
} from "@/lib/content/seo-check"
import { cn } from "@/lib/utils"

const STATUS_ICON: Record<SeoCheckStatus, typeof CircleCheckIcon> = {
  [SEO_CHECK_STATUS.PASS]: CircleCheckIcon,
  [SEO_CHECK_STATUS.WARN]: CircleAlertIcon,
  [SEO_CHECK_STATUS.FAIL]: CircleXIcon,
}

const STATUS_CLASS: Record<SeoCheckStatus, string> = {
  [SEO_CHECK_STATUS.PASS]: "text-emerald-600 dark:text-emerald-400",
  [SEO_CHECK_STATUS.WARN]: "text-amber-600 dark:text-amber-400",
  [SEO_CHECK_STATUS.FAIL]: "text-destructive",
}

// 即時 SEO 健檢：輸入內容先以 useDeferredValue 延後，長文打字時檢查不會拖慢編輯器
export function SeoChecklist(props: SeoCheckInput) {
  const deferred = useDeferredValue(props)

  const checks = useMemo(() => runSeoChecks(deferred), [deferred])
  const passedCount = checks.filter((check) => check.status === SEO_CHECK_STATUS.PASS).length

  const renderCheck = (check: SeoCheck) => {
    const Icon = STATUS_ICON[check.status]

    return (
      <li key={check.id} className="flex gap-2.5">
        <Icon className={cn("mt-0.5 size-4 shrink-0", STATUS_CLASS[check.status])} aria-hidden />
        <div className="grid min-w-0 gap-0.5">
          <p className="text-sm font-medium">
            {check.label}
            <span className="sr-only">：{SEO_CHECK_STATUS_LABEL[check.status]}</span>
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
          <SearchCheckIcon className="size-4" aria-hidden />
          SEO 健檢
        </CardTitle>
        <CardDescription>
          {passedCount} / {checks.length} 項通過
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="mb-4 flex h-1.5 gap-0.5 overflow-hidden rounded-full"
          role="img"
          aria-label={`SEO 健檢通過 ${passedCount} / ${checks.length} 項`}
        >
          {checks.map((check) => (
            <span
              key={check.id}
              className={cn(
                "flex-1 first:rounded-l-full last:rounded-r-full",
                check.status === SEO_CHECK_STATUS.PASS ? "bg-emerald-500" : "bg-muted",
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
