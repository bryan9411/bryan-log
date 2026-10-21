import {
  ALLOWED_FORMAT_LABEL,
  IMAGE_EXTENSIONS,
  IMAGE_MIME,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_MEGABYTES,
  type ImageMime,
} from "@/lib/storage/constants"

export type ImageValidationResult =
  { ok: true; mime: ImageMime; extension: string } | { ok: false; message: string }

const SIGNATURE_BYTES = 12

const matchesBytes = (bytes: Uint8Array, expected: number[], offset = 0) =>
  expected.every((value, index) => bytes[offset + index] === value)

const matchesAscii = (bytes: Uint8Array, expected: string, offset = 0) =>
  matchesBytes(
    bytes,
    [...expected].map((char) => char.charCodeAt(0)),
    offset,
  )

// 以檔案開頭的 magic number 判斷真實格式，防止把惡意檔案改副檔名偽裝成圖片
const SIGNATURE_CHECKS: Record<ImageMime, (bytes: Uint8Array) => boolean> = {
  [IMAGE_MIME.PNG]: (bytes) =>
    matchesBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  [IMAGE_MIME.JPEG]: (bytes) => matchesBytes(bytes, [0xff, 0xd8, 0xff]),
  [IMAGE_MIME.GIF]: (bytes) => matchesAscii(bytes, "GIF8"),
  [IMAGE_MIME.WEBP]: (bytes) => matchesAscii(bytes, "RIFF") && matchesAscii(bytes, "WEBP", 8),
  [IMAGE_MIME.AVIF]: (bytes) =>
    matchesAscii(bytes, "ftypavif", 4) || matchesAscii(bytes, "ftypavis", 4),
}

function isImageMime(value: string): value is ImageMime {
  return Object.values(IMAGE_MIME).includes(value as ImageMime)
}

function getExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".")
  return dotIndex === -1 ? "" : fileName.slice(dotIndex + 1).toLowerCase()
}

export async function validateImageFile(file: File): Promise<ImageValidationResult> {
  if (file.size === 0) {
    return { ok: false, message: "檔案內容為空，請重新選擇圖片" }
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, message: `圖片大小不可超過 ${MAX_UPLOAD_MEGABYTES} MB` }
  }

  const extension = getExtension(file.name)
  const unsupportedMessage = `僅支援 ${ALLOWED_FORMAT_LABEL} 格式的圖片`

  if (!isImageMime(file.type)) {
    return { ok: false, message: unsupportedMessage }
  }

  if (!IMAGE_EXTENSIONS[file.type].includes(extension)) {
    return { ok: false, message: "副檔名與檔案類型不一致" }
  }

  const header = new Uint8Array(await file.slice(0, SIGNATURE_BYTES).arrayBuffer())

  if (!SIGNATURE_CHECKS[file.type](header)) {
    return { ok: false, message: "檔案內容與宣告的圖片格式不符，已拒絕上傳" }
  }

  return { ok: true, mime: file.type, extension }
}
