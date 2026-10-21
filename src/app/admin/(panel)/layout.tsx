import { Suspense } from "react"

import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { requireAdmin } from "@/lib/auth/session"

// 身分驗證完成前不渲染任何頁面內容；未登入時於伺服器端直接導向登入頁
async function AdminGuard({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  return children
}

export default function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  const renderContentSkeleton = () => (
    <div className="grid gap-6" aria-busy aria-label="載入中">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40" />
    </div>
  )

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <AdminSidebar />
      <main className="flex-1 px-4 py-8 md:px-10">
        <div className="mx-auto grid w-full max-w-5xl gap-8">
          <Suspense fallback={renderContentSkeleton()}>
            <AdminGuard>{children}</AdminGuard>
          </Suspense>
        </div>
      </main>
    </div>
  )
}
