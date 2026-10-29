import { z } from "zod"

// 與 supabase_schema.sql 中建立的儲存桶保持一致
export const STORAGE_BUCKET = "media"

export const STORAGE_FOLDER = {
  POSTS: "posts",
  PROJECTS: "projects",
  SECTIONS: "sections",
} as const

export const storageFolderSchema = z.enum(
  [STORAGE_FOLDER.POSTS, STORAGE_FOLDER.PROJECTS, STORAGE_FOLDER.SECTIONS],
  { error: "上傳目錄不正確" },
)

export type StorageFolder = z.infer<typeof storageFolderSchema>

const BYTES_PER_MEGABYTE = 1024 * 1024

export const MAX_UPLOAD_MEGABYTES = 5
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MEGABYTES * BYTES_PER_MEGABYTE

// 刻意排除 SVG：SVG 可內嵌腳本，是常見的儲存型 XSS 入口
export const IMAGE_MIME = {
  PNG: "image/png",
  JPEG: "image/jpeg",
  WEBP: "image/webp",
  GIF: "image/gif",
  AVIF: "image/avif",
} as const

export type ImageMime = (typeof IMAGE_MIME)[keyof typeof IMAGE_MIME]

export const IMAGE_EXTENSIONS: Record<ImageMime, readonly string[]> = {
  [IMAGE_MIME.PNG]: ["png"],
  [IMAGE_MIME.JPEG]: ["jpg", "jpeg"],
  [IMAGE_MIME.WEBP]: ["webp"],
  [IMAGE_MIME.GIF]: ["gif"],
  [IMAGE_MIME.AVIF]: ["avif"],
}

export const ALLOWED_FORMAT_LABEL = "PNG、JPG、WebP、GIF、AVIF"

// 剛上傳、尚未存檔的圖片可能還沒被文章引用，掃描時保留一段寬限期避免誤刪
export const UNREFERENCED_GRACE_PERIOD_HOURS = 24
export const UNREFERENCED_GRACE_PERIOD_MS = UNREFERENCED_GRACE_PERIOD_HOURS * 60 * 60 * 1000

export const STORAGE_LIST_PAGE_SIZE = 100
export const STORAGE_DELETE_BATCH_SIZE = 100
