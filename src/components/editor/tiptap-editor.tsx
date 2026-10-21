"use client"

import { useEffect, useRef, useState } from "react"
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
import { MarkdownShortcutHelp } from "@/components/editor/markdown-shortcut-help"
import { useImageUpload } from "@/hooks/use-image-upload"
import { createContentExtensions } from "@/lib/editor/extensions"
import { IMAGE_MIME, STORAGE_FOLDER } from "@/lib/storage/constants"
import { cn } from "@/lib/utils"

const ACCEPTED_IMAGE_TYPES = Object.values(IMAGE_MIME)

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
    class: "tiptap-content prose prose-zinc dark:prose-invert max-w-none",
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
  const fileInputRef = useRef<HTMLInputElement>(null)
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
      FileHandler.configure({
        allowedMimeTypes: ACCEPTED_IMAGE_TYPES,
        onDrop: (current, files, position) => insertImages(current, files, position),
        onPaste: (current, files) => insertImages(current, files),
      }),
    ],
    content: initialContent ?? "",
    editorProps: { attributes: buildContentAttributes(isInvalid, describedBy) },
    onCreate: ({ editor: created }) => onReady?.(created),
    onUpdate: ({ editor: updated }) => onChangeRef.current(updated.getJSON()),
  })

  // useEditor 只在建立時讀取設定，驗證錯誤變動後需手動同步 aria 屬性
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    editor.setOptions({
      editorProps: { attributes: buildContentAttributes(isInvalid, describedBy) },
    })
  }, [editor, isInvalid, describedBy])

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
        onToggleShortcutHelp={() => setIsShortcutHelpOpen((isOpen) => !isOpen)}
        onPickImage={() => fileInputRef.current?.click()}
      />
    )
  }

  const maybeRenderShortcutHelp = () => {
    if (!isShortcutHelpOpen) return null
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
      className={cn(
        "overflow-hidden rounded-xl border bg-background",
        isInvalid && "border-destructive ring-3 ring-destructive/20",
      )}
    >
      {maybeRenderToolbar()}
      {maybeRenderShortcutHelp()}
      <div className="px-5 py-4 content-auto sm:px-8">
        <EditorContent editor={editor} />
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
