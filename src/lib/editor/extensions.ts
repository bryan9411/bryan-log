import type { AnyExtension, Attributes } from "@tiptap/core"
import { CodeBlock } from "@tiptap/extension-code-block"
import { Image } from "@tiptap/extension-image"
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table"
import { StarterKit } from "@tiptap/starter-kit"

// h1 保留給文章標題，內文從 h2 開始，確保頁面標題階層與 SEO 正確
export const HEADING_LEVELS = [2, 3, 4] as const

export const LINK_REL = "noopener noreferrer nofollow"

export const CODE_LANGUAGE_CLASS_PREFIX = "language-"

export const BaseCodeBlock = CodeBlock.configure({
  languageClassPrefix: CODE_LANGUAGE_CLASS_PREFIX,
  exitOnTripleEnter: true,
})

const TABLE_CELL_ALIGNMENTS: unknown[] = ["left", "center", "right"]

// 高於節點預設的解析優先權 50，才能先於標題、清單等節點自己的規則比對
const FLATTEN_RULE_PRIORITY = 60
const CELL_FLATTENED_TAGS = "h1,h2,h3,h4,h5,h6,ul,ol,li,blockquote,pre"

// 儲存格只放段落與圖片：標題不會混進目錄，也沒有巢狀結構，內容才能完整轉回 Markdown 表格。
// 官方預設以 style 輸出對齊，但內文不開放 style，改為輸出 align 屬性並由 CSS 呈現
function withSimpleContent(cell: typeof TableCell) {
  return cell.extend({
    content: "(paragraph | image)+",
    // 貼上的表格若儲存格內有標題或清單，只取其文字；否則放不進儲存格，整張表會被切開
    parseHTML() {
      return [
        {
          tag: CELL_FLATTENED_TAGS,
          context: `${this.name}//`,
          skip: true,
          priority: FLATTEN_RULE_PRIORITY,
        },
        ...(this.parent?.() ?? []),
      ]
    },
    addAttributes() {
      const attributes: Attributes = this.parent?.() ?? {}

      return {
        ...attributes,
        align: {
          ...attributes.align,
          renderHTML: ({ align }: { align?: unknown }) =>
            TABLE_CELL_ALIGNMENTS.includes(align) ? { align } : {},
        },
      }
    },
  })
}

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
    Table,
    TableRow,
    withSimpleContent(TableHeader),
    withSimpleContent(TableCell),
  ]
}
