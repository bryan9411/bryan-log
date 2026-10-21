import type { Metadata } from "next"
import { FileTextIcon } from "lucide-react"

import { AdminEmptyState } from "@/components/admin/admin-empty-state"
import { AdminPageHeader } from "@/components/admin/admin-page-header"

export const metadata: Metadata = {
  title: "文章管理",
}

export default function AdminPostsPage() {
  return (
    <>
      <AdminPageHeader title="文章管理" description="撰寫、編輯與發布技術文章" />
      <AdminEmptyState
        icon={FileTextIcon}
        title="文章編輯器建置中"
        description="Tiptap 編輯器、程式碼高亮與自動暫存功能將於下一階段開放。"
      />
    </>
  )
}
