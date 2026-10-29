"use client"

import { useEffect, useRef, useState } from "react"
import type { Editor } from "@tiptap/react"

import { tiptapJsonToMarkdown } from "@/lib/content/markdown"
import { markdownToEditorHtml } from "@/lib/editor/markdown-paste"

const SYNC_DELAY_MS = 500

type MarkdownSourceEditorProps = {
  editor: Editor
  isInvalid?: boolean
  describedBy?: string
}

// 以 Markdown 原始碼編輯文章；輸入停頓或離開欄位時寫回編輯器，表單與內容檢查因此始終拿到最新內容
export function MarkdownSourceEditor({
  editor,
  isInvalid,
  describedBy,
}: MarkdownSourceEditorProps) {
  const [markdown, setMarkdown] = useState(() => tiptapJsonToMarkdown(editor.getJSON()))
  const syncedMarkdownRef = useRef(markdown)
  const pendingMarkdownRef = useRef(markdown)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 只有原始碼確實變動時才寫回，避免單純切換模式就重新解析而改動文件
  const flush = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null

    const latest = pendingMarkdownRef.current
    if (latest === syncedMarkdownRef.current || editor.isDestroyed) return

    syncedMarkdownRef.current = latest
    editor.commands.setContent(markdownToEditorHtml(latest))
  }

  const flushRef = useRef(flush)
  useEffect(() => {
    flushRef.current = flush
  })

  // 切回預覽模式（元件卸載）時立即寫回尚未同步的內容
  useEffect(() => () => flushRef.current(), [])

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = event.target.value
    setMarkdown(next)
    pendingMarkdownRef.current = next

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(flush, SYNC_DELAY_MS)
  }

  return (
    <textarea
      value={markdown}
      onChange={handleChange}
      onBlur={flush}
      spellCheck={false}
      aria-label="文章內容（Markdown 原始碼）"
      aria-invalid={isInvalid || undefined}
      aria-describedby={describedBy}
      placeholder="以 Markdown 撰寫內容⋯⋯"
      className="block field-sizing-content min-h-80 w-full resize-y bg-transparent font-mono text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
    />
  )
}
