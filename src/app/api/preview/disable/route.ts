import { draftMode } from "next/headers"
import { redirect } from "next/navigation"
import type { NextRequest } from "next/server"
import { z } from "zod"

import { adminEditPostRoute, PREVIEW_POST_ID_PARAM, ROUTES } from "@/config/routes"

// 結束預覽後回到該文章的編輯頁；只接受 uuid，不接受任意轉址目標，避免開放式重新導向
export async function GET(request: NextRequest) {
  const draft = await draftMode()
  draft.disable()

  const parsedId = z.uuid().safeParse(request.nextUrl.searchParams.get(PREVIEW_POST_ID_PARAM))
  redirect(parsedId.success ? adminEditPostRoute(parsedId.data) : ROUTES.ADMIN_POSTS)
}
