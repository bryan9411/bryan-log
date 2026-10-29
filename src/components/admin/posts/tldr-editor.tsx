"use client"

import { useLayoutEffect, useRef } from "react"
import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { TLDR_ITEM_MAX_LENGTH, TLDR_MAX_ITEMS } from "@/lib/validations/post"
import { cn } from "@/lib/utils"

const LINE_BREAK = "\n"

const PLACEHOLDERS = [
  "React 19 以 useActionState 取代 useFormState",
  "一個 Hook 同時管理 pending、錯誤與回傳值",
]
const FALLBACK_PLACEHOLDER = "下一個重點"

type PendingFocus = {
  index: number
  caret: number
}

type TldrEditorProps = {
  id: string
  name: string
  // 多行文字，每行一點；與送出的表單值格式相同
  value: string
  onChange: (value: string) => void
  describedBy?: string
  hasError?: boolean
}

// 每點各自一個會自動長高的輸入框，附行號與字數；Enter 新增下一點、在行首按 Backspace 併回上一點
export function TldrEditor({ id, name, value, onChange, describedBy, hasError }: TldrEditorProps) {
  const lines = value.split(LINE_BREAK)
  const inputRefs = useRef<Array<HTMLTextAreaElement | null>>([])
  const pendingFocusRef = useRef<PendingFocus | null>(null)
  const canAddLine = lines.length < TLDR_MAX_ITEMS
  // 範例只在完全空白時示範寫法，已有內容時改用通用提示，避免空行看起來像已填寫
  const isEmpty = value.trim() === ""

  // 新增或合併行之後，等新的輸入框渲染完成再移動游標
  useLayoutEffect(() => {
    const pending = pendingFocusRef.current
    if (!pending) return
    pendingFocusRef.current = null
    const input = inputRefs.current[pending.index]
    input?.focus()
    input?.setSelectionRange(pending.caret, pending.caret)
  })

  const commit = (nextLines: string[], focus?: PendingFocus) => {
    if (focus) pendingFocusRef.current = focus
    onChange(nextLines.join(LINE_BREAK))
  }

  // 貼上多行文字時拆成多點
  const handleChange = (index: number, text: string) => {
    const pieces = text.split(/\r?\n/)
    const nextLines = [...lines.slice(0, index), ...pieces, ...lines.slice(index + 1)]
    const lastIndex = index + pieces.length - 1
    const focus = pieces.length > 1 ? { index: lastIndex, caret: pieces.at(-1)!.length } : undefined
    commit(nextLines, focus)
  }

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 中文輸入法選字時的 Enter 屬於組字，不能當成換行
    if (event.nativeEvent.isComposing) return

    const { selectionStart, selectionEnd, value: text } = event.currentTarget

    if (event.key === "Enter") {
      event.preventDefault()
      if (!canAddLine) return
      const nextLines = [...lines]
      nextLines.splice(index, 1, text.slice(0, selectionStart), text.slice(selectionEnd))
      commit(nextLines, { index: index + 1, caret: 0 })
      return
    }

    if (event.key === "Backspace" && index > 0 && selectionStart === 0 && selectionEnd === 0) {
      event.preventDefault()
      const previous = lines[index - 1]
      const nextLines = [...lines]
      nextLines.splice(index - 1, 2, previous + text)
      commit(nextLines, { index: index - 1, caret: previous.length })
    }
  }

  const handleAddLine = () => commit([...lines, ""], { index: lines.length, caret: 0 })

  const renderLine = (line: string, index: number) => {
    const length = line.trim().length
    const isTooLong = length > TLDR_ITEM_MAX_LENGTH

    return (
      <li key={index} className="flex items-start gap-3 px-4">
        <span
          aria-hidden
          className="w-4 shrink-0 pt-1.5 text-right font-mono text-xs text-muted-foreground tabular-nums"
        >
          {index + 1}
        </span>
        <textarea
          ref={(element) => {
            inputRefs.current[index] = element
          }}
          id={index === 0 ? id : undefined}
          aria-label={index === 0 ? undefined : `第 ${index + 1} 點`}
          aria-describedby={describedBy}
          aria-invalid={hasError || isTooLong}
          rows={1}
          value={line}
          placeholder={(isEmpty && PLACEHOLDERS[index]) || FALLBACK_PLACEHOLDER}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          className="field-sizing-content min-h-0 flex-1 resize-none bg-transparent py-1 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground/70"
        />
        <span
          className={cn(
            "shrink-0 pt-1.5 font-mono text-[11px] text-muted-foreground tabular-nums",
            isTooLong && "font-semibold text-destructive",
          )}
        >
          {length}/{TLDR_ITEM_MAX_LENGTH}
        </span>
      </li>
    )
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-input transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
        hasError &&
          "border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40",
      )}
    >
      <input type="hidden" name={name} value={value} />
      <ol className="flex flex-col gap-1 py-3">{lines.map(renderLine)}</ol>
      <div className="flex items-center justify-between gap-2 border-t border-border/60 px-2 py-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleAddLine}
          disabled={!canAddLine}
          className="text-muted-foreground"
        >
          <PlusIcon aria-hidden />
          新增一點
        </Button>
        <span className="pr-2 text-xs text-muted-foreground">
          Enter 新增下一點，行首按 Backspace 併回上一點
        </span>
      </div>
    </div>
  )
}
