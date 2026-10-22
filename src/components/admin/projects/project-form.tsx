"use client"

import { useActionState, useEffect, useEffectEvent, useRef, useState } from "react"

import { CategorySelect } from "@/components/admin/posts/category-select"
import { CoverImageField } from "@/components/admin/posts/cover-image-field"
import { PostStatusBadge } from "@/components/admin/posts/post-status-badge"
import { PostSubmitButtons } from "@/components/admin/posts/post-submit-buttons"
import { TechStackInput } from "@/components/admin/projects/tech-stack-input"
import { FieldShell, FormField } from "@/components/forms/form-field"
import { FormMessage } from "@/components/forms/form-message"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useBeforeUnload } from "@/hooks/use-before-unload"
import { ACTION_STATUS, initialActionState } from "@/lib/actions/action-state"
import { saveProjectAction, type ProjectFormState } from "@/lib/actions/projects"
import { CONTENT_STATUS } from "@/lib/constants/content"
import { slugify } from "@/lib/content/slug"
import type { EditableProject } from "@/lib/data/admin-projects"
import type { CategoryTreeNode } from "@/lib/data/categories"
import { STORAGE_FOLDER } from "@/lib/storage/constants"
import type { PostIntent } from "@/lib/validations/post"
import {
  PROJECT_INTENT,
  PROJECT_SUMMARY_MAX_LENGTH,
  PROJECT_TITLE_MAX_LENGTH,
  PROJECT_URL_MAX_LENGTH,
} from "@/lib/validations/project"

type ProjectDraft = {
  title: string
  slug: string
  summary: string
  demoUrl: string
  repoUrl: string
  techStack: string[]
  categoryId: string | null
  coverImageUrl: string | null
  isFeatured: boolean
}

type ProjectFormProps = {
  categories: CategoryTreeNode[]
  project?: EditableProject
  createdIntent?: PostIntent | null
}

const FEATURED_FIELD_ID = "isFeatured"

const CREATED_MESSAGE: Record<PostIntent, string> = {
  [PROJECT_INTENT.draft]: "草稿已建立，之後的存檔都會更新這個作品",
  [PROJECT_INTENT.publish]: "作品已建立並發布，前台作品集已即時更新",
}

function toDraft(project?: EditableProject): ProjectDraft {
  return {
    title: project?.title ?? "",
    slug: project?.slug ?? "",
    summary: project?.summary ?? "",
    demoUrl: project?.demoUrl ?? "",
    repoUrl: project?.repoUrl ?? "",
    techStack: project?.techStack ?? [],
    categoryId: project?.categoryId ?? null,
    coverImageUrl: project?.coverImageUrl ?? null,
    isFeatured: project?.isFeatured ?? false,
  }
}

export function ProjectForm({ categories, project, createdIntent }: ProjectFormProps) {
  const [state, formAction] = useActionState<ProjectFormState, FormData>(
    saveProjectAction,
    initialActionState,
  )
  const [draft, setDraft] = useState(() => toDraft(project))
  const [baseline, setBaseline] = useState(() => JSON.stringify(toDraft(project)))
  const [isSlugTouched, setIsSlugTouched] = useState(Boolean(project))
  const submittedDraftRef = useRef<string | null>(null)

  const serializedDraft = JSON.stringify(draft)
  const isDirty = serializedDraft !== baseline
  const fieldErrors = state.fieldErrors ?? {}
  const isPublished = project?.status === CONTENT_STATUS.PUBLISHED

  const displayedState: ProjectFormState =
    state.status === ACTION_STATUS.IDLE && createdIntent
      ? { status: ACTION_STATUS.SUCCESS, message: CREATED_MESSAGE[createdIntent] }
      : state

  useBeforeUnload(isDirty)

  const syncAfterSave = useEffectEvent(() => {
    setBaseline(submittedDraftRef.current ?? serializedDraft)
  })

  useEffect(() => {
    if (state.savedAt) syncAfterSave()
  }, [state.savedAt])

  const updateDraft = (patch: Partial<ProjectDraft>) =>
    setDraft((current) => ({ ...current, ...patch }))

  const handleTitleChange = (title: string) =>
    setDraft((current) => ({
      ...current,
      title,
      slug: isSlugTouched ? current.slug : slugify(title),
    }))

  // 記下送出當下的內容：存檔期間若繼續輸入，新輸入的部分仍會被視為未儲存
  const handleSubmit = (formData: FormData) => {
    submittedDraftRef.current = serializedDraft
    formAction(formData)
  }

  // 所有欄位皆由 React 狀態控制，取消 action 完成後的原生 form.reset()，避免受控欄位與狀態脫鉤
  const handleReset = (event: React.FormEvent<HTMLFormElement>) => event.preventDefault()

  const renderStatusLine = () => (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">目前狀態</span>
      {project ? <PostStatusBadge status={project.status} /> : <span>尚未儲存</span>}
    </div>
  )

  const maybeRenderDirtyHint = () => {
    if (!isDirty) return null
    return <p className="text-xs text-muted-foreground">有尚未儲存的變更</p>
  }

  const renderFeaturedToggle = () => (
    <div className="flex items-start justify-between gap-4">
      <div className="grid gap-1">
        <Label htmlFor={FEATURED_FIELD_ID}>精選作品</Label>
        <p className="text-xs text-muted-foreground">發布後會釘選於首頁精選專案區塊</p>
      </div>
      <Switch
        id={FEATURED_FIELD_ID}
        name={FEATURED_FIELD_ID}
        checked={draft.isFeatured}
        onCheckedChange={(isFeatured) => updateDraft({ isFeatured })}
      />
    </div>
  )

  return (
    <form action={handleSubmit} onReset={handleReset} noValidate className="grid gap-6">
      <input type="hidden" name="id" value={project?.id ?? ""} />
      <input type="hidden" name="categoryId" value={draft.categoryId ?? ""} />
      <input type="hidden" name="coverImageUrl" value={draft.coverImageUrl ?? ""} />

      <FormMessage state={displayedState} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card className="min-w-0 self-start">
          <CardContent className="grid gap-5">
            <FormField
              name="title"
              label="專案名稱"
              value={draft.title}
              onChange={(event) => handleTitleChange(event.target.value)}
              placeholder="例如：TaskFlow 即時協作看板"
              maxLength={PROJECT_TITLE_MAX_LENGTH}
              errors={fieldErrors.title}
              className="h-11 text-lg font-medium"
            />
            <FormField
              name="slug"
              label="網址代稱"
              value={draft.slug}
              onChange={(event) => {
                setIsSlugTouched(true)
                updateDraft({ slug: event.target.value.toLowerCase() })
              }}
              placeholder="taskflow-realtime-kanban"
              autoComplete="off"
              spellCheck={false}
              errors={fieldErrors.slug}
              hint={`作品網址：/projects/${draft.slug || "網址代稱"}。中文名稱請手動輸入英文代稱`}
              className="font-mono"
            />
            <FieldShell
              id="summary"
              label="簡介"
              errors={fieldErrors.summary}
              hint={`顯示於作品卡片與搜尋結果（${draft.summary.length}/${PROJECT_SUMMARY_MAX_LENGTH}）`}
            >
              {(describedBy, hasError) => (
                <Textarea
                  id="summary"
                  name="summary"
                  rows={4}
                  value={draft.summary}
                  onChange={(event) => updateDraft({ summary: event.target.value })}
                  maxLength={PROJECT_SUMMARY_MAX_LENGTH}
                  placeholder="用一兩句話說明這個專案解決了什麼問題"
                  aria-invalid={hasError}
                  aria-describedby={describedBy}
                />
              )}
            </FieldShell>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                name="demoUrl"
                label="展示連結"
                type="url"
                inputMode="url"
                value={draft.demoUrl}
                onChange={(event) => updateDraft({ demoUrl: event.target.value })}
                placeholder="https://"
                maxLength={PROJECT_URL_MAX_LENGTH}
                errors={fieldErrors.demoUrl}
                hint="選填，線上展示網址"
              />
              <FormField
                name="repoUrl"
                label="GitHub 原始碼連結"
                type="url"
                inputMode="url"
                value={draft.repoUrl}
                onChange={(event) => updateDraft({ repoUrl: event.target.value })}
                placeholder="https://github.com/"
                maxLength={PROJECT_URL_MAX_LENGTH}
                errors={fieldErrors.repoUrl}
                hint="選填，公開的原始碼倉庫"
              />
            </div>
            <TechStackInput
              value={draft.techStack}
              onChange={(techStack) => updateDraft({ techStack })}
              errors={fieldErrors.techStack}
            />
          </CardContent>
        </Card>

        <aside className="grid content-start gap-4 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">發布設定</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {renderStatusLine()}
              {renderFeaturedToggle()}
              <PostSubmitButtons isPublished={isPublished} noun="作品" />
              {maybeRenderDirtyHint()}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid gap-5">
              <CategorySelect
                categories={categories}
                value={draft.categoryId}
                onChange={(categoryId) => updateDraft({ categoryId })}
                errors={fieldErrors.categoryId}
              />
              <CoverImageField
                value={draft.coverImageUrl}
                onChange={(coverImageUrl) => updateDraft({ coverImageUrl })}
                errors={fieldErrors.coverImageUrl}
                folder={STORAGE_FOLDER.PROJECTS}
                label="預覽圖"
              />
            </CardContent>
          </Card>
        </aside>
      </div>
    </form>
  )
}
