import { NextResponse, type NextRequest } from "next/server"

import { getAdminUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { MAX_UPLOAD_BYTES, STORAGE_BUCKET, storageFolderSchema } from "@/lib/storage/constants"
import { buildObjectPath } from "@/lib/storage/paths"
import type { UploadResponse } from "@/lib/storage/types"
import { validateImageFile } from "@/lib/storage/validation"

const HTTP_STATUS = {
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYLOAD_TOO_LARGE: 413,
  INTERNAL_ERROR: 500,
} as const

// multipart 表單會帶有邊界字串等額外內容，預留少量緩衝避免誤判
const MULTIPART_OVERHEAD_BYTES = 64 * 1024

const errorResponse = (error: string, status: number) =>
  NextResponse.json<UploadResponse>({ error }, { status })

export async function POST(request: NextRequest) {
  const user = await getAdminUser()

  if (!user) {
    return errorResponse("尚未登入或登入已逾時，請重新登入", HTTP_STATUS.UNAUTHORIZED)
  }

  // 先檢查宣告的大小，在讀取整個請求內容前就拒絕過大的檔案
  const contentLength = Number(request.headers.get("content-length") ?? 0)

  if (contentLength > MAX_UPLOAD_BYTES + MULTIPART_OVERHEAD_BYTES) {
    return errorResponse("圖片檔案過大", HTTP_STATUS.PAYLOAD_TOO_LARGE)
  }

  let formData: FormData

  try {
    formData = await request.formData()
  } catch {
    return errorResponse("無法解析上傳內容", HTTP_STATUS.BAD_REQUEST)
  }

  const file = formData.get("file")
  const folder = storageFolderSchema.safeParse(formData.get("folder"))

  if (!(file instanceof File)) {
    return errorResponse("請選擇要上傳的圖片", HTTP_STATUS.BAD_REQUEST)
  }

  if (!folder.success) {
    return errorResponse(folder.error.issues[0].message, HTTP_STATUS.BAD_REQUEST)
  }

  const validation = await validateImageFile(file)

  if (!validation.ok) {
    return errorResponse(validation.message, HTTP_STATUS.BAD_REQUEST)
  }

  const supabase = await createClient()
  const bucket = supabase.storage.from(STORAGE_BUCKET)
  const path = buildObjectPath(folder.data, validation.extension)

  const { error } = await bucket.upload(path, file, {
    contentType: validation.mime,
    cacheControl: "31536000",
    upsert: false,
  })

  if (error) {
    return errorResponse("圖片上傳失敗，請稍後再試", HTTP_STATUS.INTERNAL_ERROR)
  }

  const { data } = bucket.getPublicUrl(path)

  return NextResponse.json<UploadResponse>(
    { url: data.publicUrl, path },
    { status: HTTP_STATUS.CREATED },
  )
}
