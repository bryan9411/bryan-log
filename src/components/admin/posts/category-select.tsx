"use client"

import { FieldShell } from "@/components/forms/form-field"
import { NativeSelect } from "@/components/forms/native-select"
import type { CategoryTreeNode } from "@/lib/data/categories"

type CategorySelectProps = {
  categories: CategoryTreeNode[]
  value: string | null
  onChange: (categoryId: string | null) => void
  errors?: string[]
}

const NONE = ""

// 由單一 categoryId 反推父／子分類，兩個下拉選單皆為受控元件，不需額外同步狀態
function resolveSelection(categories: CategoryTreeNode[], categoryId: string | null) {
  if (!categoryId) return { parentId: NONE, childId: NONE }

  for (const parent of categories) {
    if (parent.id === categoryId) return { parentId: parent.id, childId: NONE }
    if (parent.children.some((child) => child.id === categoryId)) {
      return { parentId: parent.id, childId: categoryId }
    }
  }

  return { parentId: NONE, childId: NONE }
}

export function CategorySelect({ categories, value, onChange, errors }: CategorySelectProps) {
  const { parentId, childId } = resolveSelection(categories, value)
  const children = categories.find((parent) => parent.id === parentId)?.children ?? []
  const hasChildren = children.length > 0

  return (
    <div className="grid gap-3">
      <FieldShell id="parentCategory" label="主分類" errors={errors}>
        {(describedBy, hasError) => (
          <NativeSelect
            id="parentCategory"
            value={parentId}
            aria-invalid={hasError}
            aria-describedby={describedBy}
            onChange={(event) => onChange(event.target.value || null)}
          >
            <option value={NONE}>未分類</option>
            {categories.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.name}
              </option>
            ))}
          </NativeSelect>
        )}
      </FieldShell>

      <FieldShell
        id="childCategory"
        label="子分類"
        hint={parentId && !hasChildren ? "此主分類沒有子分類" : undefined}
      >
        {(describedBy) => (
          <NativeSelect
            id="childCategory"
            value={childId}
            disabled={!hasChildren}
            aria-describedby={describedBy}
            onChange={(event) => onChange(event.target.value || parentId || null)}
          >
            <option value={NONE}>{parentId ? "不指定（歸於主分類）" : "請先選擇主分類"}</option>
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </NativeSelect>
        )}
      </FieldShell>
    </div>
  )
}
