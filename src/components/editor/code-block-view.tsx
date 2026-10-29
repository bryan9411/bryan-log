"use client"

import { NodeViewContent, NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react"
import { CheckIcon, CopyIcon, WandSparklesIcon } from "lucide-react"

import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { CODE_LANGUAGES, normalizeCodeLanguage } from "@/lib/editor/languages"
import { markdownToEditorHtml } from "@/lib/editor/markdown-paste"

export function CodeBlockView({ node, updateAttributes, editor, getPos }: ReactNodeViewProps) {
  const { isCopied, copy } = useCopyToClipboard()

  const language = normalizeCodeLanguage(node.attrs.language)
  const isEditable = editor.isEditable

  // 將整個 Markdown 程式碼區塊替換為解析後的標題、段落、清單等內容
  const convertToContent = () => {
    const position = getPos()
    if (typeof position !== "number") return

    editor
      .chain()
      .focus()
      .insertContentAt(
        { from: position, to: position + node.nodeSize },
        markdownToEditorHtml(node.textContent),
      )
      .run()
  }

  const maybeRenderConvertButton = () => {
    if (!isEditable || language !== "markdown") return null

    return (
      <button
        type="button"
        onClick={convertToContent}
        className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <WandSparklesIcon className="size-3.5" />
        轉為文章格式
      </button>
    )
  }

  const renderCopyButton = () => (
    <button
      type="button"
      onClick={() => copy(node.textContent)}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label={isCopied ? "已複製程式碼" : "複製程式碼"}
    >
      {isCopied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
      {isCopied ? "已複製" : "複製"}
    </button>
  )

  return (
    <NodeViewWrapper className="code-block not-prose" data-language={language}>
      <div className="code-block-header" contentEditable={false}>
        <select
          value={language}
          disabled={!isEditable}
          onChange={(event) => updateAttributes({ language: event.target.value })}
          className="rounded-md bg-transparent px-1 py-0.5 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="程式語言"
        >
          {CODE_LANGUAGES.map(({ id, label }) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        {maybeRenderConvertButton()}
        {renderCopyButton()}
      </div>
      <pre className="shiki" spellCheck={false}>
        <NodeViewContent<"code"> as="code" />
      </pre>
    </NodeViewWrapper>
  )
}
