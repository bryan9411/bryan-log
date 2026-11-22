import "server-only"

import { sanitizeEditorHtml } from "@/lib/content/sanitize"
import { markdownToEditorHtml } from "@/lib/editor/markdown-paste"

// 收藏筆記以 Markdown 儲存；預覽沿用編輯器的 Markdown 轉換，再以與文章相同的白名單清理
export function renderCollectionNote(markdown: string) {
  if (!markdown.trim()) return ""
  return sanitizeEditorHtml(markdownToEditorHtml(markdown))
}
