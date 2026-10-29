"use client"

import { useEffect, useState } from "react"
import { CheckIcon, LoaderCircleIcon, XIcon } from "lucide-react"

import { FieldShell } from "@/components/forms/form-field"
import { checkPostSlugAction, type SlugAvailability } from "@/lib/actions/posts"
import { SLUG_MAX_LENGTH, SLUG_PATTERN } from "@/lib/content/slug"
import { cn } from "@/lib/utils"

// 停止輸入一小段時間後才查詢，避免每打一個字就送出一次請求
const CHECK_DELAY_MS = 400

const SLUG_STATUS = {
  EMPTY: "empty",
  INVALID: "invalid",
  CHECKING: "checking",
  AVAILABLE: "available",
  TAKEN: "taken",
  UNKNOWN: "unknown",
} as const

type SlugStatus = (typeof SLUG_STATUS)[keyof typeof SLUG_STATUS]

type CheckResult = {
  slug: string
  availability: SlugAvailability | null
}

type SlugFieldProps = {
  value: string
  onChange: (value: string) => void
  sectionSlug: string | undefined
  // 編輯既有文章時排除自己，避免把自己的代稱判定為重複
  postId?: string
  errors?: string[]
}

const isWellFormedSlug = (slug: string) => slug.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(slug)

export function SlugField({ value, onChange, sectionSlug, postId, errors }: SlugFieldProps) {
  const [result, setResult] = useState<CheckResult | null>(null)
  const isWellFormed = isWellFormedSlug(value)

  useEffect(() => {
    if (!isWellFormed) return

    let isStale = false
    const timer = setTimeout(async () => {
      const availability = await checkPostSlugAction(value, postId).catch(() => null)
      if (!isStale) setResult({ slug: value, availability })
    }, CHECK_DELAY_MS)

    return () => {
      isStale = true
      clearTimeout(timer)
    }
  }, [value, postId, isWellFormed])

  // 狀態由目前輸入值與最後一次查詢結果推導，查詢結果對不上目前輸入時視為檢查中
  const getStatus = (): SlugStatus => {
    if (!value) return SLUG_STATUS.EMPTY
    if (!isWellFormed) return SLUG_STATUS.INVALID
    if (result?.slug !== value) return SLUG_STATUS.CHECKING
    if (!result.availability) return SLUG_STATUS.UNKNOWN
    return result.availability.available ? SLUG_STATUS.AVAILABLE : SLUG_STATUS.TAKEN
  }

  const status = getStatus()
  const conflictTitle = result?.slug === value ? result.availability?.conflictTitle : undefined

  const renderStatusBadge = () => {
    switch (status) {
      case SLUG_STATUS.CHECKING:
        return (
          <span className="flex items-center gap-1 text-muted-foreground">
            <LoaderCircleIcon className="size-3.5 animate-spin" aria-hidden />
            檢查中
          </span>
        )
      case SLUG_STATUS.AVAILABLE:
        return (
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckIcon className="size-3.5" aria-hidden />
            可使用
          </span>
        )
      case SLUG_STATUS.TAKEN:
        return (
          <span className="flex items-center gap-1 text-destructive">
            <XIcon className="size-3.5" aria-hidden />
            已被使用
          </span>
        )
      default:
        return null
    }
  }

  const renderHint = () => {
    if (status === SLUG_STATUS.TAKEN) {
      return (
        <span className="text-destructive">
          已被《{conflictTitle}》使用。網址代稱全站唯一，不同區塊也不能重複
        </span>
      )
    }
    if (status === SLUG_STATUS.INVALID) {
      return (
        <span className="text-destructive">
          僅能使用小寫英文、數字與連字號，且不可以連字號開頭或結尾
        </span>
      )
    }
    return "網址代稱全站唯一，不同區塊也不能重複。中文標題請手動輸入英文代稱，建議描述文章內容，例如 js-execution-context"
  }

  const prefix = `/${sectionSlug ?? "區塊"}/`

  return (
    <FieldShell id="slug" label="網址代稱" errors={errors} hint={renderHint()}>
      {(describedBy, hasError) => (
        <div
          className={cn(
            "flex h-12 items-stretch overflow-hidden rounded-lg border border-input transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
            (hasError || status === SLUG_STATUS.TAKEN) &&
              "border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40",
          )}
        >
          <span
            aria-hidden
            className="flex shrink-0 items-center border-r border-input bg-muted/60 px-3 font-mono text-sm text-muted-foreground"
          >
            {prefix}
          </span>
          <input
            id="slug"
            name="slug"
            value={value}
            onChange={(event) => onChange(event.target.value.toLowerCase())}
            placeholder="react-19-use-action-state"
            autoComplete="off"
            spellCheck={false}
            maxLength={SLUG_MAX_LENGTH}
            aria-invalid={hasError || status === SLUG_STATUS.TAKEN}
            aria-describedby={describedBy}
            className="min-w-0 flex-1 bg-transparent px-3 font-mono text-base outline-none placeholder:text-muted-foreground"
          />
          <span role="status" className="flex shrink-0 items-center pr-3 text-xs font-medium">
            {renderStatusBadge()}
          </span>
        </div>
      )}
    </FieldShell>
  )
}
