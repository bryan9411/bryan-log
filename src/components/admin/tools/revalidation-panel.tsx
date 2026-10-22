"use client"

import { startTransition, useActionState, useState, useTransition } from "react"
import { DatabaseIcon, HistoryIcon, Loader2Icon, RefreshCwIcon, ZapIcon } from "lucide-react"

import { FieldShell, FormField } from "@/components/forms/form-field"
import { FormMessage } from "@/components/forms/form-message"
import { NativeSelect } from "@/components/forms/native-select"
import { SubmitButton } from "@/components/forms/submit-button"
import { Button } from "@/components/ui/button"
import { ACTION_STATUS, initialActionState } from "@/lib/actions/action-state"
import {
  revalidatePathAction,
  revalidateTagAction,
  type RevalidateState,
} from "@/lib/actions/revalidate"
import type { CacheTag } from "@/lib/cache-tags"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  CACHE_TAG_LABEL,
  cacheTagSchema,
  REVALIDATE_PATH_MAX_LENGTH,
  REVALIDATE_PRESETS,
  REVALIDATE_TYPE,
  REVALIDATE_TYPE_LABEL,
  revalidateTypeSchema,
  type RevalidatePreset,
  type RevalidateType,
} from "@/lib/validations/revalidate"

// 操作紀錄只保留在本次頁面中，最多顯示最近幾筆
const MAX_LOG_ENTRIES = 8

const CACHE_TAGS = cacheTagSchema.options
const REVALIDATE_TYPES = revalidateTypeSchema.options

const parseRevalidateType = (value: unknown) =>
  revalidateTypeSchema.catch(REVALIDATE_TYPE.AUTO).parse(value)

const describeTarget = (formData: FormData) =>
  `${formData.get("path")}（${REVALIDATE_TYPE_LABEL[parseRevalidateType(formData.get("type"))]}）`

type LogEntry = {
  id: number
  target: string
  message: string
  isError: boolean
  at: number
}

export function RevalidationPanel() {
  const [isTagPending, startTagTransition] = useTransition()

  const [path, setPath] = useState("/")
  const [type, setType] = useState<RevalidateType>(REVALIDATE_TYPE.AUTO)
  const [log, setLog] = useState<LogEntry[]>([])
  const [tagState, setTagState] = useState<RevalidateState>(initialActionState)

  const appendLog = (target: string, result: RevalidateState) => {
    if (!result.message) return

    setLog((current) =>
      [
        {
          id: result.revalidatedAt ?? Date.now(),
          target,
          message: result.message ?? "",
          isError: result.status === ACTION_STATUS.ERROR,
          at: Date.now(),
        },
        ...current,
      ].slice(0, MAX_LOG_ENTRIES),
    )
  }

  const [pathState, formAction, isPathPending] = useActionState<RevalidateState, FormData>(
    async (previousState, formData) => {
      const result = await revalidatePathAction(previousState, formData)
      // 欄位驗證錯誤只顯示在表單上，不寫入操作紀錄
      if (!result.fieldErrors) appendLog(describeTarget(formData), result)
      return result
    },
    initialActionState,
  )

  const isBusy = isPathPending || isTagPending
  const fieldErrors = pathState.fieldErrors ?? {}

  // 一鍵預設：同步帶入輸入欄位並直接送出，結果與手動輸入共用同一份狀態與紀錄
  const runPreset = (preset: RevalidatePreset) => {
    setPath(preset.path)
    setType(preset.type)

    const formData = new FormData()
    formData.set("path", preset.path)
    formData.set("type", preset.type)
    startTransition(() => formAction(formData))
  }

  const runTag = (tag: CacheTag) => {
    startTagTransition(async () => {
      const result = await revalidateTagAction(tag)
      setTagState(result)
      appendLog(`資料快取：${CACHE_TAG_LABEL[tag]}`, result)
    })
  }

  // 欄位皆為受控元件，取消 action 完成後的原生 form.reset()
  const handleReset = (event: React.FormEvent<HTMLFormElement>) => event.preventDefault()

  const renderPresetButton = (preset: RevalidatePreset) => (
    <Button
      key={`${preset.path}-${preset.type}`}
      type="button"
      variant="outline"
      disabled={isBusy}
      onClick={() => runPreset(preset)}
      className="h-auto flex-col items-start gap-0.5 px-3 py-2 text-left"
    >
      <span className="font-medium">{preset.label}</span>
      <span className="font-mono text-xs font-normal text-muted-foreground">
        {preset.description}
      </span>
    </Button>
  )

  const renderTagButton = (tag: CacheTag) => (
    <Button key={tag} type="button" variant="outline" disabled={isBusy} onClick={() => runTag(tag)}>
      {isTagPending ? (
        <Loader2Icon className="animate-spin" aria-hidden />
      ) : (
        <DatabaseIcon aria-hidden />
      )}
      {CACHE_TAG_LABEL[tag]}
    </Button>
  )

  const renderLogEntry = (entry: LogEntry) => (
    <li key={`${entry.id}-${entry.at}`} className="grid gap-0.5 px-3 py-2 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate font-mono text-xs">{entry.target}</span>
        <time className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {formatDateTime(new Date(entry.at))}
        </time>
      </div>
      <p className={cn("text-xs", entry.isError ? "text-destructive" : "text-muted-foreground")}>
        {entry.message}
      </p>
    </li>
  )

  const maybeRenderLog = () => {
    if (log.length === 0) return null

    return (
      <section className="grid gap-2" aria-labelledby="revalidate-log-heading">
        <h3
          id="revalidate-log-heading"
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground"
        >
          <HistoryIcon className="size-4" aria-hidden />
          本次操作紀錄
        </h3>
        <ul className="divide-y rounded-lg border" aria-live="polite">
          {log.map(renderLogEntry)}
        </ul>
      </section>
    )
  }

  return (
    <div className="grid gap-8">
      <section className="grid gap-3" aria-labelledby="revalidate-presets-heading">
        <h3
          id="revalidate-presets-heading"
          className="flex items-center gap-1.5 text-sm font-medium"
        >
          <ZapIcon className="size-4" aria-hidden />
          一鍵重新驗證
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {REVALIDATE_PRESETS.map(renderPresetButton)}
        </div>
      </section>

      <form
        action={formAction}
        onReset={handleReset}
        noValidate
        className="grid gap-4"
        aria-labelledby="revalidate-custom-heading"
      >
        <h3 id="revalidate-custom-heading" className="text-sm font-medium">
          自訂路徑
        </h3>
        <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
          <FormField
            name="path"
            label="路徑"
            value={path}
            onChange={(event) => setPath(event.target.value)}
            placeholder="/posts/react-19-use-action-state"
            maxLength={REVALIDATE_PATH_MAX_LENGTH}
            autoComplete="off"
            spellCheck={false}
            errors={fieldErrors.path}
            hint="站內路徑，例如 /posts/文章代稱；動態路由請寫成 /posts/[slug]"
            className="font-mono"
          />
          <FieldShell id="type" label="類型" errors={fieldErrors.type}>
            {(describedBy, hasError) => (
              <NativeSelect
                id="type"
                name="type"
                value={type}
                onChange={(event) => setType(parseRevalidateType(event.target.value))}
                aria-invalid={hasError}
                aria-describedby={describedBy}
              >
                {REVALIDATE_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {REVALIDATE_TYPE_LABEL[option]}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FieldShell>
        </div>
        <FormMessage state={pathState} />
        <div>
          <SubmitButton pendingText="重新驗證中…" disabled={isTagPending}>
            <RefreshCwIcon aria-hidden />
            重新驗證
          </SubmitButton>
        </div>
      </form>

      <section className="grid gap-3" aria-labelledby="revalidate-tags-heading">
        <div className="grid gap-1">
          <h3 id="revalidate-tags-heading" className="text-sm font-medium">
            清除資料快取
          </h3>
          <p className="text-xs text-muted-foreground">
            直接在 Supabase 修改資料後使用：所有引用該資料的頁面都會在下一次造訪時重新查詢
          </p>
        </div>
        <div className="flex flex-wrap gap-2">{CACHE_TAGS.map(renderTagButton)}</div>
        <FormMessage state={tagState} />
      </section>

      {maybeRenderLog()}
    </div>
  )
}
