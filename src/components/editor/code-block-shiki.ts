import { ReactNodeViewRenderer } from "@tiptap/react"

import { CodeBlockView } from "@/components/editor/code-block-view"
import { createShikiPlugin } from "@/components/editor/shiki-plugin"
import { BaseCodeBlock } from "@/lib/editor/extensions"

// 沿用伺服器端相同的程式碼區塊 schema，只在瀏覽器端加上 Shiki 高亮與 React 節點檢視
export const CodeBlockShiki = BaseCodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView)
  },

  addProseMirrorPlugins() {
    return [...(this.parent?.() ?? []), createShikiPlugin()]
  },
})
