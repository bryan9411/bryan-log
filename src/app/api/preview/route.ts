import { draftMode } from "next/headers"
import { redirect } from "next/navigation"
import type { NextRequest } from "next/server"
import { z } from "zod"

import { PREVIEW_POST_ID_PARAM, previewPostPath, ROUTES } from "@/config/routes"
import { getAdminUser } from "@/lib/auth/session"

// 啟用 Draft Mode 後轉往預覽頁；只有已登入的管理員能啟用，預覽頁本身也會再驗證一次身分
export async function GET(request: NextRequest) {
  const parsedId = z.uuid().safeParse(request.nextUrl.searchParams.get(PREVIEW_POST_ID_PARAM))
  if (!parsedId.success) return new Response("文章識別碼不正確", { status: 400 })

  const user = await getAdminUser()
  if (!user) redirect(ROUTES.ADMIN_LOGIN)

  const draft = await draftMode()
  draft.enable()

  redirect(previewPostPath(parsedId.data))
}
