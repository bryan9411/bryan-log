import { getAdminUser } from "@/lib/auth/session"
import { listPostsForExport } from "@/lib/data/posts"
import { buildArchiveFilename, buildPostsArchive } from "@/lib/export/posts-archive"

// 全站文章備份：只有已登入的管理員可下載（proxy 只保護 /admin 頁面，API 需自行驗證）
export async function GET() {
  const user = await getAdminUser()
  if (!user) return new Response("請先登入管理後台", { status: 401 })

  const exportedAt = new Date()
  const archive = buildPostsArchive(await listPostsForExport(), exportedAt)

  return new Response(archive, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${buildArchiveFilename(exportedAt)}"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  })
}
