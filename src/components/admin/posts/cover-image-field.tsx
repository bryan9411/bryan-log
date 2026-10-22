"use client"

import Image from "next/image"
import { useRef } from "react"
import { ImageUpIcon, Loader2Icon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useImageUpload } from "@/hooks/use-image-upload"
import {
  ALLOWED_FORMAT_LABEL,
  IMAGE_MIME,
  MAX_UPLOAD_MEGABYTES,
  STORAGE_FOLDER,
  type StorageFolder,
} from "@/lib/storage/constants"

type CoverImageFieldProps = {
  value: string | null
  onChange: (url: string | null) => void
  errors?: string[]
  // 文章與作品共用此欄位，上傳目錄與顯示文字依使用處調整
  folder?: StorageFolder
  label?: string
}

export function CoverImageField({
  value,
  onChange,
  errors,
  folder = STORAGE_FOLDER.POSTS,
  label = "封面圖片",
}: CoverImageFieldProps) {
  const { upload, error: uploadError, isUploading } = useImageUpload(folder)
  const inputRef = useRef<HTMLInputElement>(null)

  const errorMessage = uploadError ?? errors?.[0] ?? null

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    const url = await upload(file)
    if (url) onChange(url)
  }

  const renderPreview = () => {
    if (!value) {
      return (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground transition-colors hover:bg-muted"
        >
          {isUploading ? (
            <Loader2Icon className="size-5 animate-spin" aria-hidden />
          ) : (
            <ImageUpIcon className="size-5" aria-hidden />
          )}
          {isUploading ? "上傳中⋯⋯" : `上傳${label}`}
        </button>
      )
    }

    return (
      <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
        <Image src={value} alt={`${label}預覽`} fill sizes="320px" className="object-cover" />
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="absolute top-2 right-2 size-7"
          aria-label={`移除${label}`}
          onClick={() => onChange(null)}
        >
          <XIcon />
        </Button>
      </div>
    )
  }

  const maybeRenderError = () => {
    if (!errorMessage) return null
    return (
      <p role="alert" className="text-sm text-destructive">
        {errorMessage}
      </p>
    )
  }

  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {renderPreview()}
      <p className="text-xs text-muted-foreground">
        支援 {ALLOWED_FORMAT_LABEL}，上限 {MAX_UPLOAD_MEGABYTES} MB
      </p>
      {maybeRenderError()}
      <input
        ref={inputRef}
        type="file"
        accept={Object.values(IMAGE_MIME).join(",")}
        hidden
        onChange={handleFileChange}
      />
    </div>
  )
}
