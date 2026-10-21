import type { AnyExtension } from "@tiptap/core"
import { CodeBlock } from "@tiptap/extension-code-block"
import { Image } from "@tiptap/extension-image"
import { StarterKit } from "@tiptap/starter-kit"

// h1 保留給文章標題，內文從 h2 開始，確保頁面標題階層與 SEO 正確
export const HEADING_LEVELS = [2, 3, 4] as const

export const LINK_REL = "noopener noreferrer nofollow"

export const CODE_LANGUAGE_CLASS_PREFIX = "language-"

export const BaseCodeBlock = CodeBlock.configure({
  languageClassPrefix: CODE_LANGUAGE_CLASS_PREFIX,
  exitOnTripleEnter: true,
})

// 伺服器端（JSON 驗證、HTML 輸出）與瀏覽器端編輯器共用同一份 schema
// 瀏覽器端只替換程式碼區塊的呈現方式（加上 Shiki 高亮與複製按鈕），節點結構完全相同
export function createContentExtensions(codeBlock: AnyExtension = BaseCodeBlock): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: { levels: [...HEADING_LEVELS] },
      codeBlock: false,
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        protocols: ["http", "https", "mailto"],
        HTMLAttributes: { rel: LINK_REL, target: "_blank" },
      },
    }),
    codeBlock,
    Image.configure({ inline: false, allowBase64: false }),
  ]
}
