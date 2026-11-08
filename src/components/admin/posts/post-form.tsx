"use client"

import { useActionState, useEffect, useMemo, useRef, useState } from "react"
import type { Editor, JSONContent } from "@tiptap/react"
import { EyeIcon } from "lucide-react"

import { AutosaveStatus } from "@/components/admin/posts/autosave-status"
import { CategorySelect } from "@/components/admin/posts/category-select"
import { CoverImageField } from "@/components/admin/posts/cover-image-field"
import { PostStatusBadge } from "@/components/admin/posts/post-status-badge"
import { PostSubmitButtons } from "@/components/admin/posts/post-submit-buttons"
import { RestoreBackupBanner } from "@/components/admin/posts/restore-backup-banner"
import { PostHealthChecks } from "@/components/admin/posts/post-health-checks"
import { SlugField } from "@/components/admin/posts/slug-field"
import { TldrEditor } from "@/components/admin/posts/tldr-editor"
import { LazyTiptapEditor } from "@/components/editor/lazy-tiptap-editor"
import { FieldShell, FormField, getFieldErrorId } from "@/components/forms/form-field"
import { FormMessage } from "@/components/forms/form-message"
import { NativeSelect } from "@/components/forms/native-select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { enablePreviewRoute } from "@/config/routes"
import { useAutosave, useAutosaveBackup } from "@/hooks/use-autosave"
import { useBeforeUnload } from "@/hooks/use-before-unload"
import { removeLocalStorage } from "@/hooks/use-local-storage-value"
import { ACTION_STATUS, initialActionState } from "@/lib/actions/action-state"
import { savePostAction, type PostFormState } from "@/lib/actions/posts"
import { CONTENT_STATUS } from "@/lib/constants/content"
import { slugify } from "@/lib/content/slug"
import { isFutureTaipeiDateTimeInput, toTaipeiDateTimeInput } from "@/lib/format"
import type { CategoryTreeNode } from "@/lib/data/categories"
import type { EditablePost } from "@/lib/data/posts"
import type { Section } from "@/lib/data/sections"
import {
  POST_EXCERPT_MAX_LENGTH,
  POST_INTENT,
  parseTldrLines,
  POST_TITLE_MAX_LENGTH,
  TLDR_ITEM_MAX_LENGTH,
  TLDR_MAX_ITEMS,
  type PostIntent,
} from "@/lib/validations/post"

type PostDraft = {
  title: string
  slug: string
  excerpt: string
  // 多行文字，每行一點；送出時由伺服器拆成陣列
  tldr: string
  sectionId: string
  categoryId: string | null
  coverImageUrl: string | null
  content: JSONContent | null
  // datetime-local 欄位的值（台灣時間），空字串表示未指定
  publishedAt: string
}

type PostFormProps = {
  sections: Section[]
  // 以區塊 id 為鍵的分類樹；切換區塊時分類選單立即換成該區塊的分類
  categoriesBySection: Record<string, CategoryTreeNode[]>
  post?: EditablePost
  createdIntent?: PostIntent | null
}

const EMPTY_DOC: JSONContent = { type: "doc", content: [] }
const DRAFT_STORAGE_PREFIX = "bryan-log:post-draft:"
const NEW_POST_STORAGE_SUFFIX = "new"

const getStorageKey = (postId?: string) =>
  `${DRAFT_STORAGE_PREFIX}${postId ?? NEW_POST_STORAGE_SUFFIX}`

const CREATED_MESSAGE: Record<PostIntent, string> = {
  [POST_INTENT.SAVE_DRAFT]: "草稿已建立，之後的存檔都會更新這篇文章",
  [POST_INTENT.PUBLISH]: "文章已建立並發布，前台內容已即時更新",
}

function toDraft(defaultSectionId: string, post?: EditablePost): PostDraft {
  return {
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    excerpt: post?.excerpt ?? "",
    tldr: post?.tldr.join("\n") ?? "",
    sectionId: post?.sectionId ?? defaultSectionId,
    categoryId: post?.categoryId ?? null,
    coverImageUrl: post?.coverImageUrl ?? null,
    content: post?.contentJson ?? null,
    publishedAt: toTaipeiDateTimeInput(post?.publishedAt),
  }
}

export function PostForm({ sections, categoriesBySection, post, createdIntent }: PostFormProps) {
  // 新文章預設放在排序第一的區塊
  const defaultSectionId = sections[0]?.id ?? ""
  const [draft, setDraft] = useState(() => toDraft(defaultSectionId, post))
  const [baseline, setBaseline] = useState(() => JSON.stringify(toDraft(defaultSectionId, post)))
  const [isSlugTouched, setIsSlugTouched] = useState(Boolean(post))
  const [isBackupResolved, setIsBackupResolved] = useState(false)
  // 是否為未來時間只影響按鈕文字與提示，在事件中更新以維持渲染純粹；實際行為由伺服器判斷
  const [isFutureTime, setIsFutureTime] = useState(Boolean(post?.isScheduled))
  const editorRef = useRef<Editor | null>(null)

  const storageKey = getStorageKey(post?.id)
  const backup = useAutosaveBackup<PostDraft>(storageKey)

  const serializedDraft = JSON.stringify(draft)
  // 內文可能很長，輸入標題等其他欄位時沿用上次的序列化結果
  const serializedContent = useMemo(
    () => JSON.stringify(draft.content ?? EMPTY_DOC),
    [draft.content],
  )
  const isDirty = serializedDraft !== baseline
  const baselineUpdatedAt = post ? Date.parse(post.updatedAt) : 0
  const tldrCount = parseTldrLines(draft.tldr).length
  const isPublished = post?.status === CONTENT_STATUS.PUBLISHED
  const isScheduled = Boolean(post?.isScheduled)
  const activeSection = sections.find((section) => section.id === draft.sectionId)
  const categories = categoriesBySection[draft.sectionId] ?? []

  // 只有「存在比資料庫更新、且內容不同的舊暫存」時才需要詢問；詢問期間暫停自動暫存，避免覆蓋使用者還沒看過的備份
  const shouldOfferRestore =
    !isBackupResolved &&
    backup !== null &&
    backup.savedAt > baselineUpdatedAt &&
    JSON.stringify(backup.data) !== baseline

  const { lastSavedAt, hasStorageError, markSynced, clear } = useAutosave({
    storageKey,
    data: draft,
    enabled: !shouldOfferRestore,
    // 本次編輯第一次寫入暫存後，之後讀到的暫存都是自己寫的，不再需要詢問還原
    onSaved: () => setIsBackupResolved(true),
  })

  // 以送出當下的內容作為新基準：存檔期間若繼續輸入，新輸入的部分仍會被視為未儲存
  // 發布時間以伺服器實際寫入的值為準（留空時由伺服器決定、轉草稿時會被清空）
  const saveAndSync = async (previous: PostFormState, formData: FormData) => {
    const result = await savePostAction(previous, formData)
    if (!result.savedAt) return result

    const publishedAt = toTaipeiDateTimeInput(result.publishedAt)
    const synced = { ...draft, publishedAt }
    setDraft((current) => ({ ...current, publishedAt }))
    setIsFutureTime(isFutureTaipeiDateTimeInput(publishedAt))
    setBaseline(JSON.stringify(synced))
    clear()
    markSynced(synced)
    return result
  }

  const [state, formAction] = useActionState<PostFormState, FormData>(
    saveAndSync,
    initialActionState,
  )
  const fieldErrors = state.fieldErrors ?? {}

  const displayedState: PostFormState =
    state.status === ACTION_STATUS.IDLE && createdIntent
      ? {
          status: ACTION_STATUS.SUCCESS,
          message: isScheduled ? "文章已建立並排程" : CREATED_MESSAGE[createdIntent],
        }
      : state

  useBeforeUnload(isDirty)

  // 新文章建立後已轉到編輯頁，舊的「新文章」暫存不再需要
  useEffect(() => {
    if (createdIntent) removeLocalStorage(getStorageKey())
  }, [createdIntent])

  const updateDraft = (patch: Partial<PostDraft>) =>
    setDraft((current) => ({ ...current, ...patch }))

  const handlePublishedAtChange = (publishedAt: string) => {
    updateDraft({ publishedAt })
    setIsFutureTime(isFutureTaipeiDateTimeInput(publishedAt))
  }

  const handleTitleChange = (title: string) =>
    setDraft((current) => ({
      ...current,
      title,
      slug: isSlugTouched ? current.slug : slugify(title),
    }))

  // 分類只屬於單一區塊，換區塊時原本的分類一定不適用，因此一併清空
  const handleSectionChange = (sectionId: string) => updateDraft({ sectionId, categoryId: null })

  const handleRestore = () => {
    if (!backup) return
    // 舊版暫存可能沒有後來新增的欄位（例如 TL;DR、所屬區塊），以目前的預設值補齊
    const restored = { ...toDraft(draft.sectionId, post), ...backup.data }
    setDraft(restored)
    setIsFutureTime(isFutureTaipeiDateTimeInput(restored.publishedAt))
    editorRef.current?.commands.setContent(backup.data.content ?? EMPTY_DOC)
    setIsSlugTouched(true)
    setIsBackupResolved(true)
    markSynced(backup.data)
  }

  const handleDiscard = () => {
    clear()
    setIsBackupResolved(true)
  }

  // React 19 在 action 完成後會呼叫原生 form.reset()，受控的 <select> 會被瀏覽器重設為第一個選項而與狀態脫鉤
  // 本表單所有欄位皆由 React 狀態控制，不需要原生重設，因此直接取消
  const handleReset = (event: React.FormEvent<HTMLFormElement>) => event.preventDefault()

  const maybeRenderRestoreBanner = () => {
    if (!shouldOfferRestore || !backup) return null
    return (
      <RestoreBackupBanner
        savedAt={backup.savedAt}
        onRestore={handleRestore}
        onDiscard={handleDiscard}
      />
    )
  }

  const maybeRenderContentError = () => {
    const message = fieldErrors.contentJson?.[0]
    if (!message) return null
    return (
      <p id={getFieldErrorId("contentJson")} className="text-sm text-destructive">
        {message}
      </p>
    )
  }

  // 預覽讀取的是資料庫中最後儲存的版本，尚未建立的新文章無法預覽
  const maybeRenderPreviewButton = () => {
    if (!post) return null

    return (
      <div className="grid gap-1.5">
        <Button asChild variant="outline">
          <a href={enablePreviewRoute(post.id)} target="_blank" rel="noopener">
            <EyeIcon aria-hidden />
            預覽草稿
          </a>
        </Button>
        <p className="text-xs text-muted-foreground">
          {isDirty ? "有尚未儲存的變更，請先儲存再預覽" : "於新分頁以訪客視角預覽最後儲存的版本"}
        </p>
      </div>
    )
  }

  const renderStatusLine = () => (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">目前狀態</span>
      {post ? (
        <PostStatusBadge status={post.status} isScheduled={isScheduled} />
      ) : (
        <span>尚未儲存</span>
      )}
    </div>
  )

  const getPublishLabel = () => {
    if (isFutureTime) {
      if (isScheduled) return "更新排程"
      return isPublished ? "改為排程" : "排程發布"
    }
    return isScheduled ? "立即發布" : undefined
  }

  const getPublishedAtHint = () => {
    if (isFutureTime && isPublished && !isScheduled) {
      return "注意：文章會先從前台下架，到這個時間才重新出現"
    }
    if (isFutureTime) return "台灣時間。到時間後約 5 分鐘內會出現在前台"
    if (isPublished) return "台灣時間。前台顯示的日期與排序都以此為準，更新後生效"
    return "台灣時間。留空為按下發布的當下，選未來時間即為排程；存成草稿不會保留"
  }

  return (
    <form action={formAction} onReset={handleReset} noValidate className="grid gap-6">
      <input type="hidden" name="id" value={post?.id ?? ""} />
      <input type="hidden" name="sectionId" value={draft.sectionId} />
      <input type="hidden" name="categoryId" value={draft.categoryId ?? ""} />
      <input type="hidden" name="coverImageUrl" value={draft.coverImageUrl ?? ""} />
      <input type="hidden" name="contentJson" value={serializedContent} />

      {maybeRenderRestoreBanner()}
      <FormMessage state={displayedState} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid min-w-0 content-start gap-5">
          <FormField
            name="title"
            label="標題"
            value={draft.title}
            onChange={(event) => handleTitleChange(event.target.value)}
            placeholder="例如：React 19 useActionState 完全指南"
            maxLength={POST_TITLE_MAX_LENGTH}
            errors={fieldErrors.title}
            className="h-14 px-4 text-xl font-semibold md:text-xl"
          />
          <SlugField
            value={draft.slug}
            onChange={(slug) => {
              setIsSlugTouched(true)
              updateDraft({ slug })
            }}
            sectionSlug={activeSection?.slug}
            postId={post?.id}
            errors={fieldErrors.slug}
          />
          <FieldShell
            id="tldr"
            label={`⚡ TL;DR 核心速讀（${tldrCount} / ${TLDR_MAX_ITEMS} 點）`}
            errors={fieldErrors.tldr}
            hint={`每點一句、最多 ${TLDR_ITEM_MAX_LENGTH} 字；顯示於文章頂部，也是 AI 搜尋最常引用的段落`}
          >
            {(describedBy, hasError) => (
              <TldrEditor
                id="tldr"
                name="tldr"
                value={draft.tldr}
                onChange={(tldr) => updateDraft({ tldr })}
                describedBy={describedBy}
                hasError={hasError}
              />
            )}
          </FieldShell>
          <div className="grid gap-2">
            <span className="text-sm leading-none font-medium">內文</span>
            <LazyTiptapEditor
              initialContent={draft.content}
              onChange={(content) => updateDraft({ content })}
              onReady={(editor) => {
                editorRef.current = editor
              }}
              isInvalid={Boolean(fieldErrors.contentJson)}
              describedBy={fieldErrors.contentJson ? getFieldErrorId("contentJson") : undefined}
            />
            {maybeRenderContentError()}
          </div>
        </div>

        <aside className="grid content-start gap-4 lg:sticky lg:top-6 lg:max-h-[calc(100svh-3rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:pb-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">發布設定</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {renderStatusLine()}
              <FormField
                name="publishedAt"
                label="發布時間"
                type="datetime-local"
                value={draft.publishedAt}
                onChange={(event) => handlePublishedAtChange(event.target.value)}
                errors={fieldErrors.publishedAt}
                hint={getPublishedAtHint()}
              />
              <PostSubmitButtons
                isPublished={isPublished}
                draftLabel={isScheduled ? "取消排程" : undefined}
                publishLabel={getPublishLabel()}
              />
              <AutosaveStatus lastSavedAt={lastSavedAt} hasStorageError={hasStorageError} />
              {maybeRenderPreviewButton()}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid gap-5">
              <FieldShell
                id="section"
                label="內容區塊"
                errors={fieldErrors.sectionId}
                hint="文章會出現在此區塊的前台列表頁"
              >
                {(describedBy, hasError) => (
                  <NativeSelect
                    id="section"
                    value={draft.sectionId}
                    aria-invalid={hasError}
                    aria-describedby={describedBy}
                    onChange={(event) => handleSectionChange(event.target.value)}
                  >
                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.name}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </FieldShell>
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
              />
              <FieldShell
                id="excerpt"
                label="摘要"
                errors={fieldErrors.excerpt}
                hint="留空則不顯示摘要，搜尋結果與分享預覽會改用網站預設描述"
              >
                {(describedBy, hasError) => (
                  <Textarea
                    id="excerpt"
                    name="excerpt"
                    rows={4}
                    value={draft.excerpt}
                    onChange={(event) => updateDraft({ excerpt: event.target.value })}
                    maxLength={POST_EXCERPT_MAX_LENGTH}
                    aria-invalid={hasError}
                    aria-describedby={describedBy}
                  />
                )}
              </FieldShell>
            </CardContent>
          </Card>

          <PostHealthChecks
            title={draft.title}
            slug={draft.slug}
            excerpt={draft.excerpt}
            tldr={draft.tldr}
            categoryId={draft.categoryId}
            coverImageUrl={draft.coverImageUrl}
            content={draft.content}
          />
        </aside>
      </div>
    </form>
  )
}
