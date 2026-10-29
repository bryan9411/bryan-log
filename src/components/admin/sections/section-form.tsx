"use client"

import { useActionState, useState } from "react"

import { CoverImageField } from "@/components/admin/posts/cover-image-field"
import { FieldShell, FormField } from "@/components/forms/form-field"
import { FormMessage } from "@/components/forms/form-message"
import { SubmitButton } from "@/components/forms/submit-button"
import { Button } from "@/components/ui/button"
import { DialogClose, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ACTION_STATUS, initialActionState } from "@/lib/actions/action-state"
import { saveSectionAction, type SectionFormState } from "@/lib/actions/sections"
import { slugify } from "@/lib/content/slug"
import { STORAGE_FOLDER } from "@/lib/storage/constants"
import type { AdminSection } from "@/lib/data/sections"
import {
  SECTION_DESCRIPTION_MAX_LENGTH,
  SECTION_NAME_MAX_LENGTH,
  SECTION_SORT_ORDER_MAX,
  SECTION_SORT_ORDER_MIN,
} from "@/lib/validations/section"

type SectionFormProps = {
  // 編輯時傳入既有區塊；新增時為 null
  section: AdminSection | null
  // 新增時會帶回新區塊的 id
  onSuccess: (message: string, sectionId?: string) => void
}

export function SectionForm({ section, onSuccess }: SectionFormProps) {
  const [state, formAction] = useActionState<SectionFormState, FormData>(
    async (previousState, formData) => {
      const result = await saveSectionAction(previousState, formData)
      if (result.status === ACTION_STATUS.SUCCESS && result.message) {
        onSuccess(result.message, result.sectionId)
      }
      return result
    },
    initialActionState,
  )
  const [name, setName] = useState(section?.name ?? "")
  const [slug, setSlug] = useState(section?.slug ?? "")
  // 編輯既有區塊時不自動改寫網址代稱，避免前台既有連結失效
  const [isSlugTouched, setIsSlugTouched] = useState(section !== null)
  const [description, setDescription] = useState(section?.description ?? "")
  const [coverImageUrl, setCoverImageUrl] = useState(section?.coverImageUrl ?? null)
  const [sortOrder, setSortOrder] = useState(String(section?.sortOrder ?? 0))

  const fieldErrors = state.fieldErrors ?? {}
  const isSlugChanged = section !== null && slug !== section.slug

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value)
    if (!isSlugTouched) setSlug(slugify(event.target.value))
  }

  const handleSlugChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(event.target.value.toLowerCase())
    setIsSlugTouched(true)
  }

  // 所有欄位皆為受控元件；React 19 會在 action 完成後重設表單，需阻止以免畫面與狀態不同步
  const handleReset = (event: React.FormEvent<HTMLFormElement>) => event.preventDefault()

  const slugHint = isSlugChanged
    ? `變更後列表頁網址改為 /${slug || "網址代稱"}，舊的列表網址將失效；文章內頁會自動轉址`
    : `前台網址：/${slug || "網址代稱"}。英文名稱會自動轉換，中文名稱請手動輸入`

  return (
    <form action={formAction} onReset={handleReset} noValidate className="grid gap-5">
      <input type="hidden" name="id" value={section?.id ?? ""} />
      <input type="hidden" name="coverImageUrl" value={coverImageUrl ?? ""} />

      <FormMessage state={state} />

      <FormField
        name="name"
        label="區塊名稱"
        value={name}
        onChange={handleNameChange}
        maxLength={SECTION_NAME_MAX_LENGTH}
        placeholder="例如：旅遊心得"
        autoComplete="off"
        hint="會顯示在導覽列、首頁與列表頁標題"
        errors={fieldErrors.name}
        required
      />

      <FormField
        name="slug"
        label="網址代稱"
        value={slug}
        onChange={handleSlugChange}
        placeholder="例如：travel"
        autoComplete="off"
        spellCheck={false}
        className="font-mono"
        hint={slugHint}
        errors={fieldErrors.slug}
        required
      />

      <FieldShell
        id="description"
        label="簡短描述（選填）"
        errors={fieldErrors.description}
        hint={`顯示在列表頁標題下方；${description.length} / ${SECTION_DESCRIPTION_MAX_LENGTH} 字`}
      >
        {(describedBy, hasError) => (
          <Textarea
            id="description"
            name="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={SECTION_DESCRIPTION_MAX_LENGTH}
            rows={3}
            aria-invalid={hasError}
            aria-describedby={describedBy}
          />
        )}
      </FieldShell>

      <div className="grid gap-1.5">
        <CoverImageField
          value={coverImageUrl}
          onChange={setCoverImageUrl}
          errors={fieldErrors.coverImageUrl}
          folder={STORAGE_FOLDER.SECTIONS}
          label="封面圖片"
        />
        <p className="text-xs text-muted-foreground">
          選填。顯示在首頁「探索主題」卡片上方，建議 16:9；未上傳時以區塊配色顯示預設圖
        </p>
      </div>

      <FormField
        name="sortOrder"
        label="排序權重"
        type="number"
        inputMode="numeric"
        value={sortOrder}
        onChange={(event) => setSortOrder(event.target.value)}
        min={SECTION_SORT_ORDER_MIN}
        max={SECTION_SORT_ORDER_MAX}
        step={1}
        hint="數字越小越前面（導覽列與首頁的順序），相同時依名稱排序"
        errors={fieldErrors.sortOrder}
        className="w-32"
      />

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            取消
          </Button>
        </DialogClose>
        <SubmitButton pendingText="儲存中…">{section ? "儲存變更" : "新增區塊"}</SubmitButton>
      </DialogFooter>
    </form>
  )
}
