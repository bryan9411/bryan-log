"use client"

import { useState } from "react"
import { XIcon } from "lucide-react"

import { FieldShell } from "@/components/forms/form-field"
import { cn } from "@/lib/utils"

// 按下 Enter 或輸入逗號（含全形）即新增標籤
const TAG_SEPARATOR_PATTERN = /[,，]/
const ADD_TAG_KEYS = new Set(["Enter", "Tab"])

type TagInputProps = {
  id: string
  label: string
  value: string[]
  onChange: (tags: string[]) => void
  maxItems: number
  maxLength: number
  placeholder: string
  // 有值時為每個標籤輸出同名的 hidden input，供表單 FormData 讀取
  name?: string
  // 標籤的稱呼，用於無障礙說明，例如「技術標籤」
  tagNoun?: string
  mono?: boolean
  errors?: string[]
}

const hasTag = (tags: string[], tag: string) =>
  tags.some((existing) => existing.toLowerCase() === tag.toLowerCase())

export function TagInput({
  id,
  label,
  value,
  onChange,
  maxItems,
  maxLength,
  placeholder,
  name,
  tagNoun = "標籤",
  mono = false,
  errors,
}: TagInputProps) {
  const [draft, setDraft] = useState("")

  const isFull = value.length >= maxItems

  // 一次可貼上多個以逗號分隔的標籤；重複（不分大小寫）與超出上限的部分自動略過
  const addTags = (raw: string) => {
    const next = [...value]

    raw
      .split(TAG_SEPARATOR_PATTERN)
      .map((tag) => tag.trim().slice(0, maxLength))
      .forEach((tag) => {
        if (!tag || hasTag(next, tag) || next.length >= maxItems) return
        next.push(tag)
      })

    if (next.length !== value.length) onChange(next)
    setDraft("")
  }

  const removeTag = (tag: string) => onChange(value.filter((existing) => existing !== tag))

  const handleChange = (text: string) => {
    if (TAG_SEPARATOR_PATTERN.test(text)) addTags(text)
    else setDraft(text)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // 輸入法選字中的 Enter 不應新增標籤
    if (event.nativeEvent.isComposing) return

    if (ADD_TAG_KEYS.has(event.key) && draft.trim()) {
      event.preventDefault()
      addTags(draft)
      return
    }

    if (event.key === "Backspace" && !draft && value.length > 0) {
      removeTag(value[value.length - 1])
    }
  }

  const renderTag = (tag: string) => (
    <li
      key={tag}
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-md border border-foreground/10 bg-foreground/[0.06] pr-1 pl-2 text-xs text-foreground/80",
        mono && "font-mono",
      )}
    >
      {tag}
      <button
        type="button"
        onClick={() => removeTag(tag)}
        aria-label={`移除${tagNoun}「${tag}」`}
        className="rounded-sm p-0.5 text-muted-foreground transition-colors outline-none hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <XIcon className="size-3" aria-hidden />
      </button>
    </li>
  )

  return (
    <FieldShell
      id={id}
      label={label}
      errors={errors}
      hint={`按 Enter 或逗號新增，最多 ${maxItems} 個（${value.length}/${maxItems}）`}
    >
      {(describedBy, hasError) => (
        <div
          className={cn(
            "flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-input px-2 py-1.5 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
            hasError && "border-destructive ring-3 ring-destructive/20",
          )}
        >
          {name
            ? value.map((tag) => <input key={tag} type="hidden" name={name} value={tag} />)
            : null}
          <ul aria-label={`已加入的${tagNoun}`} className="contents">
            {value.map(renderTag)}
          </ul>
          <input
            id={id}
            value={draft}
            onChange={(event) => handleChange(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => addTags(draft)}
            disabled={isFull}
            maxLength={maxLength}
            placeholder={isFull ? "已達標籤上限" : placeholder}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={hasError}
            aria-describedby={describedBy}
            className="h-6 min-w-32 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          />
        </div>
      )}
    </FieldShell>
  )
}
