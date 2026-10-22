import type { Metadata } from "next"
import { ArchiveIcon, RefreshCwIcon } from "lucide-react"

import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { ExportPostsButton } from "@/components/admin/tools/export-posts-button"
import { RevalidationPanel } from "@/components/admin/tools/revalidation-panel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "站務工具",
}

const EXPORT_CONTENTS = [
  "每篇文章一個 Markdown 檔，開頭附 YAML Frontmatter",
  "包含草稿、分類、封面與內文圖片網址、發布與更新時間",
  "附 index.json 索引，方便以程式匯入其他平台",
]

export default function AdminToolsPage() {
  return (
    <>
      <AdminPageHeader title="站務工具" description="資料備份與快取除錯" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArchiveIcon className="size-4" aria-hidden />
            文章備份匯出
          </CardTitle>
          <CardDescription>將所有文章打包成 ZIP 下載，保有內容的完整所有權</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <ul className="grid list-disc gap-1 pl-5 text-sm text-muted-foreground">
            {EXPORT_CONTENTS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div>
            <ExportPostsButton variant="default" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCwIcon className="size-4" aria-hidden />
            快取重新驗證
          </CardTitle>
          <CardDescription>
            前台頁面皆有快取；後台存檔時會自動更新。若直接修改資料庫或懷疑頁面內容過期，可在此手動清除
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RevalidationPanel />
        </CardContent>
      </Card>
    </>
  )
}
