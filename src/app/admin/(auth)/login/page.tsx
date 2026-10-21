import type { Metadata } from "next"
import { Suspense } from "react"
import { LockKeyholeIcon } from "lucide-react"

import { REDIRECT_PARAM } from "@/config/routes"
import { siteConfig } from "@/config/site"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getSafeRedirectPath } from "@/lib/auth/redirect"

import { LoginForm } from "./login-form"

export const metadata: Metadata = {
  title: "管理員登入",
}

async function LoginFormWithRedirect({ searchParams }: PageProps<"/admin/login">) {
  const params = await searchParams
  const redirectTo = getSafeRedirectPath(params[REDIRECT_PARAM])

  return <LoginForm redirectTo={redirectTo} />
}

// 本頁刻意不提供任何註冊入口：管理員帳號僅能由 Supabase 後台手動建立
export default function AdminLoginPage(props: PageProps<"/admin/login">) {
  const renderFormSkeleton = () => (
    <div className="grid gap-5" aria-hidden>
      <Skeleton className="h-14" />
      <Skeleton className="h-14" />
      <Skeleton className="h-10" />
    </div>
  )

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader className="gap-3 text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-muted">
            <LockKeyholeIcon className="size-5 text-muted-foreground" aria-hidden />
          </div>
          <CardTitle className="text-xl">管理員登入</CardTitle>
          <CardDescription>登入 {siteConfig.name} 管理後台</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={renderFormSkeleton()}>
            <LoginFormWithRedirect {...props} />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  )
}
