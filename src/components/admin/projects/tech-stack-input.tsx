"use client"

import { useState } from "react"
import { XIcon } from "lucide-react"

import { FieldShell } from "@/components/forms/form-field"
import { cn } from "@/lib/utils"
import {
  TECH_STACK_FIELD,
  TECH_STACK_MAX_ITEMS,
  TECH_TAG_MAX_LENGTH,
} from "@/lib/validations/project"

// 按下 Enter 或輸入逗號（含全形）即新增標籤
const TAG_SEPARATOR_PATTERN = /[,，]/
const ADD_TAG_KEYS = new Set(["Enter", "Tab"])

type TechStackInputProps = {
  value: string[]
  onChange: (tags: string[]) => void
  errors?: string[]
}

const hasTag = (tags: string[], tag: string) =>
  tags.some((existing) => existing.toLowerCase() === tag.toLowerCase())

export function TechStackInput({ value, onChange, errors }: TechStackInputProps) {
  const [draft, setDraft] = useState("")

  const isFull = value.length >= TECH_STACK_MAX_ITEMS

  // 一次可貼上多個以逗號分隔的標籤；重複（不分大小寫）與超出上限的部分自動略過
  const addTags = (raw: string) => {
    const next = [...value]

    raw
      .split(TAG_SEPARATOR_PATTERN)
      .map((tag) => tag.trim().slice(0, TECH_TAG_MAX_LENGTH))
      .forEach((tag) => {
        if (!tag || hasTag(next, tag) || next.length >= TECH_STACK_MAX_ITEMS) return
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
      className="inline-flex h-6 items-center gap-1 rounded-md border border-foreground/10 bg-foreground/[0.06] pr-1 pl-2 font-mono text-xs text-foreground/80"
    >
      {tag}
      <button
        type="button"
        onClick={() => removeTag(tag)}
        aria-label={`移除技術標籤「${tag}」`}
        className="rounded-sm p-0.5 text-muted-foreground transition-colors outline-none hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <XIcon className="size-3" aria-hidden />
      </button>
    </li>
  )

  return (
    <FieldShell
      id={TECH_STACK_FIELD}
      label="技術標籤"
      errors={errors}
      hint={`按 Enter 或逗號新增，最多 ${TECH_STACK_MAX_ITEMS} 個（${value.length}/${TECH_STACK_MAX_ITEMS}）`}
    >
      {(describedBy, hasError) => (
        <div
          className={cn(
            "flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-input px-2 py-1.5 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
            hasError && "border-destructive ring-3 ring-destructive/20",
          )}
        >
          {value.map((tag) => (
            <input key={tag} type="hidden" name={TECH_STACK_FIELD} value={tag} />
          ))}
          <ul aria-label="已加入的技術標籤" className="contents">
            {value.map(renderTag)}
          </ul>
          <input
            id={TECH_STACK_FIELD}
            value={draft}
            onChange={(event) => handleChange(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => addTags(draft)}
            disabled={isFull}
            maxLength={TECH_TAG_MAX_LENGTH}
            placeholder={isFull ? "已達標籤上限" : "例如：Next.js、Supabase"}
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
