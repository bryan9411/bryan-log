"use client"

import { useEditorState, type Editor } from "@tiptap/react"
import {
  BoldIcon,
  CodeIcon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
  ImagePlusIcon,
  ItalicIcon,
  KeyboardIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  MinusIcon,
  QuoteIcon,
  Redo2Icon,
  SquareCodeIcon,
  StrikethroughIcon,
  Undo2Icon,
  type LucideIcon,
} from "lucide-react"

import { DEFAULT_CODE_LANGUAGE } from "@/lib/editor/languages"
import { LINK_PROTOCOL_PATTERN } from "@/lib/editor/link"
import { cn } from "@/lib/utils"

type ToolbarAction = {
  key: string
  label: string
  shortcut?: string
  icon: LucideIcon
  run: (editor: Editor) => void
  isActive?: (editor: Editor) => boolean
  canRun?: (editor: Editor) => boolean
}

type EditorToolbarProps = {
  editor: Editor
  isShortcutHelpOpen: boolean
  onToggleShortcutHelp: () => void
  onPickImage: () => void
}

function promptForLink(editor: Editor) {
  const previousUrl: unknown = editor.getAttributes("link").href
  const input = window.prompt(
    "請輸入連結網址（留空即移除連結）",
    typeof previousUrl === "string" ? previousUrl : "https://",
  )

  if (input === null) return

  const url = input.trim()

  if (!url) {
    editor.chain().focus().extendMarkRange("link").unsetLink().run()
    return
  }

  if (!LINK_PROTOCOL_PATTERN.test(url)) {
    window.alert("連結必須以 https://、http:// 或 mailto: 開頭")
    return
  }

  editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
}

const ACTION_GROUPS: ToolbarAction[][] = [
  [
    {
      key: "h2",
      label: "大標題",
      shortcut: "## ",
      icon: Heading2Icon,
      run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: (editor) => editor.isActive("heading", { level: 2 }),
    },
    {
      key: "h3",
      label: "中標題",
      shortcut: "### ",
      icon: Heading3Icon,
      run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: (editor) => editor.isActive("heading", { level: 3 }),
    },
    {
      key: "h4",
      label: "小標題",
      shortcut: "#### ",
      icon: Heading4Icon,
      run: (editor) => editor.chain().focus().toggleHeading({ level: 4 }).run(),
      isActive: (editor) => editor.isActive("heading", { level: 4 }),
    },
  ],
  [
    {
      key: "bold",
      label: "粗體",
      shortcut: "**文字**",
      icon: BoldIcon,
      run: (editor) => editor.chain().focus().toggleBold().run(),
      isActive: (editor) => editor.isActive("bold"),
    },
    {
      key: "italic",
      label: "斜體",
      shortcut: "*文字*",
      icon: ItalicIcon,
      run: (editor) => editor.chain().focus().toggleItalic().run(),
      isActive: (editor) => editor.isActive("italic"),
    },
    {
      key: "strike",
      label: "刪除線",
      shortcut: "~~文字~~",
      icon: StrikethroughIcon,
      run: (editor) => editor.chain().focus().toggleStrike().run(),
      isActive: (editor) => editor.isActive("strike"),
    },
    {
      key: "code",
      label: "行內程式碼",
      shortcut: "`程式碼`",
      icon: CodeIcon,
      run: (editor) => editor.chain().focus().toggleCode().run(),
      isActive: (editor) => editor.isActive("code"),
    },
    {
      key: "link",
      label: "插入連結",
      icon: LinkIcon,
      run: promptForLink,
      isActive: (editor) => editor.isActive("link"),
    },
  ],
  [
    {
      key: "bulletList",
      label: "項目清單",
      shortcut: "- ",
      icon: ListIcon,
      run: (editor) => editor.chain().focus().toggleBulletList().run(),
      isActive: (editor) => editor.isActive("bulletList"),
    },
    {
      key: "orderedList",
      label: "編號清單",
      shortcut: "1. ",
      icon: ListOrderedIcon,
      run: (editor) => editor.chain().focus().toggleOrderedList().run(),
      isActive: (editor) => editor.isActive("orderedList"),
    },
    {
      key: "blockquote",
      label: "引言",
      shortcut: "> ",
      icon: QuoteIcon,
      run: (editor) => editor.chain().focus().toggleBlockquote().run(),
      isActive: (editor) => editor.isActive("blockquote"),
    },
    {
      key: "codeBlock",
      label: "程式碼區塊",
      shortcut: "```",
      icon: SquareCodeIcon,
      run: (editor) =>
        editor.chain().focus().toggleCodeBlock({ language: DEFAULT_CODE_LANGUAGE }).run(),
      isActive: (editor) => editor.isActive("codeBlock"),
    },
    {
      key: "horizontalRule",
      label: "分隔線",
      shortcut: "---",
      icon: MinusIcon,
      run: (editor) => editor.chain().focus().setHorizontalRule().run(),
    },
  ],
  [
    {
      key: "undo",
      label: "復原",
      icon: Undo2Icon,
      run: (editor) => editor.chain().focus().undo().run(),
      canRun: (editor) => editor.can().undo(),
    },
    {
      key: "redo",
      label: "重做",
      icon: Redo2Icon,
      run: (editor) => editor.chain().focus().redo().run(),
      canRun: (editor) => editor.can().redo(),
    },
  ],
]

export const MARKDOWN_SHORTCUTS = ACTION_GROUPS.flat().filter((action) => action.shortcut)

type ToolbarButtonProps = {
  label: string
  icon: LucideIcon
  isActive?: boolean
  disabled?: boolean
  onClick: () => void
}

function ToolbarButton({ label, icon: Icon, isActive, disabled, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={isActive}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors",
        "hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
        isActive && "bg-muted text-foreground",
      )}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  )
}

export function EditorToolbar({
  editor,
  isShortcutHelpOpen,
  onToggleShortcutHelp,
  onPickImage,
}: EditorToolbarProps) {
  // 只訂閱工具列需要的狀態，避免每次輸入都重新渲染整個工具列
  const states = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      Object.fromEntries(
        ACTION_GROUPS.flat().map((action) => [
          action.key,
          {
            isActive: action.isActive?.(current) ?? false,
            canRun: action.canRun?.(current) ?? true,
          },
        ]),
      ),
  })

  const renderGroup = (actions: ToolbarAction[], index: number) => (
    <div key={index} className="flex items-center gap-0.5 border-r pr-1 last:border-r-0">
      {actions.map((action) => (
        <ToolbarButton
          key={action.key}
          label={action.shortcut ? `${action.label}（${action.shortcut}）` : action.label}
          icon={action.icon}
          isActive={states[action.key]?.isActive}
          disabled={!states[action.key]?.canRun}
          onClick={() => action.run(editor)}
        />
      ))}
    </div>
  )

  return (
    <div
      role="toolbar"
      aria-label="編輯器工具列"
      className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b bg-background/95 px-2 py-1.5 backdrop-blur"
    >
      {ACTION_GROUPS.map(renderGroup)}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          label="插入圖片（也可直接拖曳或貼上）"
          icon={ImagePlusIcon}
          onClick={onPickImage}
        />
        <ToolbarButton
          label="Markdown 快捷語法"
          icon={KeyboardIcon}
          isActive={isShortcutHelpOpen}
          onClick={onToggleShortcutHelp}
        />
      </div>
    </div>
  )
}
