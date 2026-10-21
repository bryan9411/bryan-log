"use client"

import { useActionState, useState } from "react"

import { FieldShell, FormField } from "@/components/forms/form-field"
import { FormMessage } from "@/components/forms/form-message"
import { NativeSelect } from "@/components/forms/native-select"
import { SubmitButton } from "@/components/forms/submit-button"
import { Button } from "@/components/ui/button"
import { DialogClose, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ACTION_STATUS, initialActionState } from "@/lib/actions/action-state"
import { saveCategoryAction, type CategoryFormState } from "@/lib/actions/categories"
import type { CategoryType } from "@/lib/constants/content"
import { slugify } from "@/lib/content/slug"
import type { AdminCategory, AdminCategoryNode } from "@/lib/data/admin-categories"
import {
  CATEGORY_DESCRIPTION_MAX_LENGTH,
  CATEGORY_NAME_MAX_LENGTH,
  CATEGORY_SORT_ORDER_MAX,
  CATEGORY_SORT_ORDER_MIN,
} from "@/lib/validations/category"

const NO_PARENT = ""

type CategoryFormProps = {
  type: CategoryType
  // 編輯時傳入既有分類；新增時為 null
  category: AdminCategory | null
  defaultParentId: string | null
  parents: AdminCategoryNode[]
  childCount: number
  onSuccess: (message: string) => void
}

export function CategoryForm({
  type,
  category,
  defaultParentId,
  parents,
  childCount,
  onSuccess,
}: CategoryFormProps) {
  const [state, formAction] = useActionState<CategoryFormState, FormData>(
    async (previousState, formData) => {
      const result = await saveCategoryAction(previousState, formData)
      if (result.status === ACTION_STATUS.SUCCESS && result.message) onSuccess(result.message)
      return result
    },
    initialActionState,
  )
  const [name, setName] = useState(category?.name ?? "")
  const [slug, setSlug] = useState(category?.slug ?? "")
  // 編輯既有分類時不自動改寫網址代稱，避免前台既有的篩選連結失效
  const [isSlugTouched, setIsSlugTouched] = useState(category !== null)
  const [parentId, setParentId] = useState(category?.parentId ?? defaultParentId ?? NO_PARENT)
  const [description, setDescription] = useState(category?.description ?? "")
  const [sortOrder, setSortOrder] = useState(String(category?.sortOrder ?? 0))

  const fieldErrors = state.fieldErrors ?? {}
  const hasChildren = childCount > 0
  // 兩層限制：可選的父分類只有頂層分類（本身已是子分類者不會出現在 parents 中），並排除自己
  const parentOptions = parents.filter((parent) => parent.id !== category?.id)

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value)
    if (!isSlugTouched) setSlug(slugify(event.target.value))
  }

  const handleSlugChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(event.target.value)
    setIsSlugTouched(true)
  }

  // 所有欄位皆為受控元件；React 19 會在 action 完成後重設表單，需阻止以免畫面與狀態不同步
  const handleReset = (event: React.FormEvent<HTMLFormElement>) => event.preventDefault()

  const parentHint = hasChildren
    ? `此分類底下有 ${childCount} 個子分類，只能維持為父分類`
    : "留空即為父分類；分類最多兩層，因此只會列出父分類"

  return (
    <form action={formAction} onReset={handleReset} noValidate className="grid gap-5">
      <input type="hidden" name="id" value={category?.id ?? ""} />
      <input type="hidden" name="type" value={type} />

      <FormMessage state={state} />

      <FormField
        name="name"
        label="分類名稱"
        value={name}
        onChange={handleNameChange}
        maxLength={CATEGORY_NAME_MAX_LENGTH}
        placeholder="例如：前端開發"
        autoComplete="off"
        errors={fieldErrors.name}
        required
      />

      <FormField
        name="slug"
        label="網址代稱"
        value={slug}
        onChange={handleSlugChange}
        placeholder="例如：frontend"
        autoComplete="off"
        spellCheck={false}
        className="font-mono"
        hint="僅限小寫英文、數字與連字號；英文名稱會自動轉換，中文名稱請手動輸入"
        errors={fieldErrors.slug}
        required
      />

      <FieldShell id="parentId" label="所屬父分類" errors={fieldErrors.parentId} hint={parentHint}>
        {(describedBy, hasError) => (
          <NativeSelect
            id="parentId"
            name="parentId"
            value={parentId}
            onChange={(event) => setParentId(event.target.value)}
            disabled={hasChildren}
            aria-invalid={hasError}
            aria-describedby={describedBy}
          >
            <option value={NO_PARENT}>無（作為父分類）</option>
            {parentOptions.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.name}
              </option>
            ))}
          </NativeSelect>
        )}
      </FieldShell>

      <FieldShell
        id="description"
        label="簡短描述（選填）"
        errors={fieldErrors.description}
        hint={`${description.length} / ${CATEGORY_DESCRIPTION_MAX_LENGTH} 字`}
      >
        {(describedBy, hasError) => (
          <Textarea
            id="description"
            name="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={CATEGORY_DESCRIPTION_MAX_LENGTH}
            rows={3}
            aria-invalid={hasError}
            aria-describedby={describedBy}
          />
        )}
      </FieldShell>

      <FormField
        name="sortOrder"
        label="排序權重"
        type="number"
        inputMode="numeric"
        value={sortOrder}
        onChange={(event) => setSortOrder(event.target.value)}
        min={CATEGORY_SORT_ORDER_MIN}
        max={CATEGORY_SORT_ORDER_MAX}
        step={1}
        hint="數字越小越前面，相同時依名稱排序"
        errors={fieldErrors.sortOrder}
        className="w-32"
      />

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            取消
          </Button>
        </DialogClose>
        <SubmitButton pendingText="儲存中…">{category ? "儲存變更" : "新增分類"}</SubmitButton>
      </DialogFooter>
    </form>
  )
}
