import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"

import {
  looksLikeMarkdown,
  markdownToEditorHtml,
  unwrapMarkdownFence,
} from "@/lib/editor/markdown-paste"

// VS Code 等編輯器複製時會附上語法高亮的 HTML，但內容本質仍是純文字，應以純文字判斷
const CODE_EDITOR_CLIPBOARD_TYPE = "vscode-editor-data"

function getPastedMarkdown(clipboard: DataTransfer) {
  const text = clipboard.getData("text/plain")
  if (!text) return null

  const hasRichHtml =
    clipboard.types.includes("text/html") && !clipboard.types.includes(CODE_EDITOR_CLIPBOARD_TYPE)
  if (hasRichHtml) return null

  return looksLikeMarkdown(text) ? text : null
}

// 貼上 Markdown 純文字時轉為對應的標題、清單、程式碼區塊等格式；在程式碼區塊內貼上則維持原樣
export const MarkdownPaste = Extension.create({
  name: "markdownPaste",

  addProseMirrorPlugins() {
    const { editor } = this

    return [
      new Plugin({
        key: new PluginKey("markdownPaste"),
        props: {
          handlePaste: (view, event) => {
            if (!event.clipboardData || view.state.selection.$from.parent.type.spec.code) {
              return false
            }

            const markdown = getPastedMarkdown(event.clipboardData)
            if (!markdown) return false

            editor.commands.insertContent(markdownToEditorHtml(unwrapMarkdownFence(markdown)))
            return true
          },
        },
      }),
    ]
  },
})
