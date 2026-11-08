"use client"

import { useEffect, useRef, useState } from "react"
import { flushSync } from "react-dom"
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
  type JSONContent,
} from "@tiptap/react"
import { FileHandler } from "@tiptap/extension-file-handler"
import { CharacterCount, Placeholder } from "@tiptap/extensions"
import { CircleAlertIcon, Loader2Icon, XIcon } from "lucide-react"

import { CodeBlockShiki } from "@/components/editor/code-block-shiki"
import { EditorToolbar } from "@/components/editor/editor-toolbar"
import { MarkdownPaste } from "@/components/editor/markdown-paste"
import { MarkdownSourceEditor } from "@/components/editor/markdown-source-editor"
import { MarkdownShortcutHelp } from "@/components/editor/markdown-shortcut-help"
import { useImageUpload } from "@/hooks/use-image-upload"
import { createContentExtensions } from "@/lib/editor/extensions"
import { PROSE_CLASS } from "@/lib/content/prose"
import { IMAGE_MIME, STORAGE_FOLDER } from "@/lib/storage/constants"
import { cn } from "@/lib/utils"

const ACCEPTED_IMAGE_TYPES = Object.values(IMAGE_MIME)

// 輸入停頓才把內容同步給表單：輸出整篇 JSON 並重新渲染表單的成本會隨文章長度增加，不能每個按鍵都做
const CONTENT_SYNC_DELAY_MS = 300

export type TiptapEditorProps = {
  initialContent: JSONContent | null
  onChange: (content: JSONContent) => void
  onReady?: (editor: Editor) => void
  isInvalid?: boolean
  describedBy?: string
}

function getAltText(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "")
}

function buildContentAttributes(isInvalid?: boolean, describedBy?: string) {
  return {
    class: `tiptap-content ${PROSE_CLASS}`,
    "aria-label": "文章內容",
    ...(isInvalid ? { "aria-invalid": "true" } : {}),
    ...(describedBy ? { "aria-describedby": describedBy } : {}),
  }
}

export function TiptapEditor({
  initialContent,
  onChange,
  onReady,
  isInvalid,
  describedBy,
}: TiptapEditorProps) {
  const {
    upload,
    error: uploadError,
    clearError,
    isUploading,
  } = useImageUpload(STORAGE_FOLDER.POSTS)
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false)
  const [isSourceMode, setIsSourceMode] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const syncTimerRef = useRef<number | null>(null)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  })

  // 逐一上傳後插入；非同步期間文件可能已變動，因此插入位置以當下文件長度為上限
  const insertImages = async (editor: Editor, files: File[], position?: number) => {
    for (const file of files) {
      const url = await upload(file)
      if (!url || editor.isDestroyed) continue

      const target = Math.min(
        position ?? editor.state.selection.anchor,
        editor.state.doc.content.size,
      )

      editor
        .chain()
        .focus()
        .insertContentAt(target, { type: "image", attrs: { src: url, alt: getAltText(file.name) } })
        .run()
    }
  }

  // 型別上 immediatelyRender 會回傳非 null，但頁面被 <Activity> 隱藏再顯示時編輯器會被銷毀重建，期間仍可能為 null
  const editor: Editor | null = useEditor({
    // 本元件只會透過 next/dynamic({ ssr: false }) 在瀏覽器載入，可安全地立即渲染
    immediatelyRender: true,
    extensions: [
      ...createContentExtensions(CodeBlockShiki),
      Placeholder.configure({
        placeholder: "開始撰寫內容⋯⋯可直接使用 Markdown 語法，或拖曳圖片至此",
      }),
      CharacterCount,
      MarkdownPaste,
      FileHandler.configure({
        allowedMimeTypes: ACCEPTED_IMAGE_TYPES,
        onDrop: (current, files, position) => insertImages(current, files, position),
        onPaste: (current, files) => insertImages(current, files),
      }),
    ],
    content: initialContent ?? "",
    editorProps: { attributes: buildContentAttributes(isInvalid, describedBy) },
    onCreate: ({ editor: created }) => onReady?.(created),
    onUpdate: ({ editor: updated }) => {
      if (syncTimerRef.current !== null) window.clearTimeout(syncTimerRef.current)

      syncTimerRef.current = window.setTimeout(() => {
        syncTimerRef.current = null
        if (!updated.isDestroyed) onChangeRef.current(updated.getJSON())
      }, CONTENT_SYNC_DELAY_MS)
    },
  })

  // useEditor 只在建立時讀取設定，驗證錯誤變動後需手動同步 aria 屬性
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    editor.setOptions({
      editorProps: { attributes: buildContentAttributes(isInvalid, describedBy) },
    })
  }, [editor, isInvalid, describedBy])

  // 尚未同步的內容不能遺失：卸載時立即同步；
  // 送出時在表單的捕獲階段同步並以 flushSync 寫回 DOM，React 讀取 FormData 時隱藏欄位已是最新內容
  useEffect(() => {
    if (!editor) return

    const flush = () => {
      if (syncTimerRef.current === null) return

      window.clearTimeout(syncTimerRef.current)
      syncTimerRef.current = null
      if (!editor.isDestroyed) onChangeRef.current(editor.getJSON())
    }
    const flushBeforeSubmit = () => flushSync(flush)
    const form = containerRef.current?.closest("form")

    form?.addEventListener("submit", flushBeforeSubmit, true)

    return () => {
      form?.removeEventListener("submit", flushBeforeSubmit, true)
      flush()
    }
  }, [editor])

  const characterCount = useEditorState({
    editor,
    // 編輯器初次渲染時擴充的 storage 可能尚未初始化，需以可選串連防護
    selector: ({ editor: current }) => current?.storage.characterCount?.characters() ?? 0,
  })

  const handlePickedFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""
    if (editor && files.length > 0) insertImages(editor, files)
  }

  const maybeRenderToolbar = () => {
    if (!editor) return null

    return (
      <EditorToolbar
        editor={editor}
        isShortcutHelpOpen={isShortcutHelpOpen}
        isSourceMode={isSourceMode}
        onToggleSourceMode={() => setIsSourceMode((isSource) => !isSource)}
        onToggleShortcutHelp={() => setIsShortcutHelpOpen((isOpen) => !isOpen)}
        onPickImage={() => fileInputRef.current?.click()}
      />
    )
  }

  const maybeRenderShortcutHelp = () => {
    if (!isShortcutHelpOpen || isSourceMode) return null
    return <MarkdownShortcutHelp />
  }

  const maybeRenderUploadStatus = () => {
    if (!isUploading) return null

    return (
      <span className="flex items-center gap-1.5" role="status">
        <Loader2Icon className="size-3.5 animate-spin" aria-hidden />
        圖片上傳中⋯⋯
      </span>
    )
  }

  const maybeRenderUploadError = () => {
    if (!uploadError) return null

    return (
      <span className="flex items-center gap-1.5 text-destructive" role="alert">
        <CircleAlertIcon className="size-3.5" aria-hidden />
        {uploadError}
        <button type="button" onClick={clearError} aria-label="關閉錯誤訊息">
          <XIcon className="size-3.5" />
        </button>
      </span>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "overflow-hidden rounded-xl border bg-background",
        isInvalid && "border-destructive ring-3 ring-destructive/20",
      )}
    >
      {maybeRenderToolbar()}
      {maybeRenderShortcutHelp()}
      <div className="px-5 py-4 content-auto sm:px-8">
        {editor && isSourceMode ? (
          <MarkdownSourceEditor editor={editor} isInvalid={isInvalid} describedBy={describedBy} />
        ) : null}
        {/* 原始碼模式只隱藏編輯器而不卸載，保留游標位置與復原紀錄 */}
        <div hidden={isSourceMode}>
          <EditorContent editor={editor} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-3">
          {maybeRenderUploadStatus()}
          {maybeRenderUploadError()}
        </div>
        <span className="tabular-nums">共 {characterCount.toLocaleString("zh-TW")} 字</span>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        multiple
        hidden
        onChange={handlePickedFiles}
      />
    </div>
  )
}
