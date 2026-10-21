import { MARKDOWN_SHORTCUTS } from "@/components/editor/editor-toolbar"
import { ALLOWED_FORMAT_LABEL, MAX_UPLOAD_MEGABYTES } from "@/lib/storage/constants"

export function MarkdownShortcutHelp() {
  return (
    <div className="grid gap-3 border-b bg-muted/40 px-4 py-3 text-sm">
      <p className="text-muted-foreground">
        在段落開頭或文字中輸入以下語法，編輯器會自動轉換格式：
      </p>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
        {MARKDOWN_SHORTCUTS.map(({ key, label, shortcut }) => (
          <div key={key} className="flex items-center justify-between gap-2">
            <dt>{label}</dt>
            <dd>
              <kbd className="rounded border bg-background px-1.5 py-0.5 font-mono text-xs">
                {shortcut}
              </kbd>
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">
        圖片可直接拖曳或貼上至編輯區，支援 {ALLOWED_FORMAT_LABEL}，單檔上限 {MAX_UPLOAD_MEGABYTES}{" "}
        MB。
      </p>
    </div>
  )
}
