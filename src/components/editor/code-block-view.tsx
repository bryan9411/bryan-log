"use client"

import { NodeViewContent, NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react"
import { CheckIcon, CopyIcon } from "lucide-react"

import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { CODE_LANGUAGES, normalizeCodeLanguage } from "@/lib/editor/languages"

export function CodeBlockView({ node, updateAttributes, editor }: ReactNodeViewProps) {
  const { isCopied, copy } = useCopyToClipboard()

  const language = normalizeCodeLanguage(node.attrs.language)
  const isEditable = editor.isEditable

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
        {renderCopyButton()}
      </div>
      <pre className="shiki" spellCheck={false}>
        <NodeViewContent<"code"> as="code" />
      </pre>
    </NodeViewWrapper>
  )
}
