"use client"

import { useEffect, useState, useTransition } from "react"
import { Loader2Icon, SaveIcon } from "lucide-react"

import { FieldShell } from "@/components/forms/form-field"
import { FormMessage } from "@/components/forms/form-message"
import { NativeSelect } from "@/components/forms/native-select"
import { TagInput } from "@/components/forms/tag-input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { RADAR_COLLECTION_STATUS_LABEL, type RadarCollectionStatus } from "@/config/radar"
import { ACTION_STATUS, initialActionState, type ActionState } from "@/lib/actions/action-state"
import {
  previewRadarCollectionNoteAction,
  updateRadarCollectionAction,
} from "@/lib/actions/radar-collections"
import { PROSE_CLASS } from "@/lib/content/prose"
import { cn } from "@/lib/utils"
import {
  RADAR_COLLECTION_NOTE_MAX_LENGTH,
  RADAR_COLLECTION_STATUSES,
  RADAR_COLLECTION_TAG_MAX_LENGTH,
  RADAR_COLLECTION_TAGS_MAX,
} from "@/lib/validations/radar-collection"

const STATUS_FIELD = "collection-status"
const TAGS_FIELD = "collection-tags"
const NOTE_FIELD = "collection-note"

const NOTE_TAB = { EDIT: "edit", PREVIEW: "preview" } as const
type NoteTab = (typeof NOTE_TAB)[keyof typeof NOTE_TAB]

type ResearchValues = {
  status: RadarCollectionStatus
  note: string
  tags: string[]
}

type CollectionResearchFormProps = ResearchValues & {
  id: string
  // 伺服器端先把已儲存的筆記轉成 HTML，第一次切到預覽不必再呼叫 Server Action
  noteHtml: string
}

const isSameValues = (a: ResearchValues, b: ResearchValues) =>
  a.status === b.status &&
  a.note === b.note &&
  a.tags.length === b.tags.length &&
  a.tags.every((tag, index) => tag === b.tags[index])

// 狀態、標籤與筆記一起儲存；有未儲存的變更時離開頁面會先確認
export function CollectionResearchForm({
  id,
  status,
  note,
  tags,
  noteHtml,
}: CollectionResearchFormProps) {
  const [saved, setSaved] = useState<ResearchValues>({ status, note, tags })
  const [values, setValues] = useState<ResearchValues>({ status, note, tags })
  const [result, setResult] = useState<ActionState>(initialActionState)
  const [isSaving, startSaving] = useTransition()

  const [tab, setTab] = useState<NoteTab>(NOTE_TAB.EDIT)
  const [preview, setPreview] = useState({ markdown: note, html: noteHtml })
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isPreviewing, startPreviewing] = useTransition()

  const isDirty = !isSameValues(values, saved)

  useEffect(() => {
    if (!isDirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [isDirty])

  const update = (next: Partial<ResearchValues>) => {
    setValues((current) => ({ ...current, ...next }))
    setResult(initialActionState)
  }

  const save = () => {
    if (!isDirty || isSaving) return
    const submitted = values

    startSaving(async () => {
      const response = await updateRadarCollectionAction(id, submitted)
      setResult(response)
      if (response.status === ACTION_STATUS.SUCCESS) setSaved(submitted)
    })
  }

  const showPreview = () => {
    setTab(NOTE_TAB.PREVIEW)
    setPreviewError(null)
    if (values.note === preview.markdown) return

    const markdown = values.note
    startPreviewing(async () => {
      const response = await previewRadarCollectionNoteAction(markdown)
      if (response.status === "success") setPreview({ markdown, html: response.html })
      else setPreviewError(response.message)
    })
  }

  const handleTabChange = (next: string) => {
    if (next === NOTE_TAB.PREVIEW) showPreview()
    else setTab(NOTE_TAB.EDIT)
  }

  // Ctrl／⌘ + S 直接儲存，不觸發瀏覽器的另存網頁
  const handleKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault()
      save()
    }
  }

  const renderPreview = () => {
    if (isPreviewing) {
      return (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" aria-hidden />
          產生預覽中…
        </p>
      )
    }
    if (previewError) {
      return <FormMessage state={{ status: ACTION_STATUS.ERROR, message: previewError }} />
    }
    if (!preview.html) {
      return <p className="text-sm text-muted-foreground">還沒有筆記。</p>
    }
    return (
      <div
        className={cn(PROSE_CLASS, "prose-sm")}
        // HTML 由伺服器以 sanitize-html 白名單清理後回傳
        dangerouslySetInnerHTML={{ __html: preview.html }}
      />
    )
  }

  return (
    <form
      className="grid gap-6"
      onKeyDown={handleKeyDown}
      onSubmit={(event) => {
        event.preventDefault()
        save()
      }}
    >
      <div className="grid gap-6 sm:grid-cols-[12rem_1fr]">
        <FieldShell id={STATUS_FIELD} label="研究狀態">
          {(describedBy) => (
            <NativeSelect
              id={STATUS_FIELD}
              value={values.status}
              aria-describedby={describedBy}
              onChange={(event) => update({ status: event.target.value as RadarCollectionStatus })}
            >
              {RADAR_COLLECTION_STATUSES.map((option) => (
                <option key={option} value={option}>
                  {RADAR_COLLECTION_STATUS_LABEL[option]}
                </option>
              ))}
            </NativeSelect>
          )}
        </FieldShell>
        <TagInput
          id={TAGS_FIELD}
          label="標籤"
          value={values.tags}
          onChange={(next) => update({ tags: next })}
          maxItems={RADAR_COLLECTION_TAGS_MAX}
          maxLength={RADAR_COLLECTION_TAG_MAX_LENGTH}
          placeholder="例如：agent、值得試用"
        />
      </div>

      <Tabs value={tab} onValueChange={handleTabChange} className="grid gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <label htmlFor={NOTE_FIELD} className="text-sm font-medium">
            筆記
            <span className="ml-2 text-xs font-normal text-muted-foreground">支援 Markdown</span>
          </label>
          <TabsList className="h-9">
            <TabsTrigger value={NOTE_TAB.EDIT}>編輯</TabsTrigger>
            <TabsTrigger value={NOTE_TAB.PREVIEW}>預覽</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value={NOTE_TAB.EDIT} className="grid gap-1.5">
          <Textarea
            id={NOTE_FIELD}
            value={values.note}
            onChange={(event) => update({ note: event.target.value })}
            maxLength={RADAR_COLLECTION_NOTE_MAX_LENGTH}
            placeholder={"## 用途\n\n## 試用心得\n\n- 優點\n- 缺點"}
            spellCheck={false}
            className="min-h-80 font-mono text-sm leading-relaxed"
          />
          <p className="text-right text-xs text-muted-foreground tabular-nums">
            {values.note.length.toLocaleString("zh-TW")} /{" "}
            {RADAR_COLLECTION_NOTE_MAX_LENGTH.toLocaleString("zh-TW")}
          </p>
        </TabsContent>
        <TabsContent
          value={NOTE_TAB.PREVIEW}
          className="min-h-80 rounded-lg border px-5 py-4"
          aria-busy={isPreviewing}
        >
          {renderPreview()}
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!isDirty || isSaving}>
          {isSaving ? (
            <Loader2Icon className="animate-spin" aria-hidden />
          ) : (
            <SaveIcon aria-hidden />
          )}
          儲存
        </Button>
        {isDirty && !isSaving ? (
          <span className="text-sm text-muted-foreground">有尚未儲存的變更（⌘／Ctrl + S）</span>
        ) : null}
        <FormMessage state={result} className="py-1.5" />
      </div>
    </form>
  )
}
