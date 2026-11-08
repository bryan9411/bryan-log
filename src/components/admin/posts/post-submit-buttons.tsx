"use client"

import { Loader2Icon, SaveIcon, SendIcon } from "lucide-react"
import { useFormStatus } from "react-dom"

import { Button } from "@/components/ui/button"
import { POST_INTENT, type PostIntent } from "@/lib/validations/post"

const INTENT_FIELD = "intent"

type PostSubmitButtonsProps = {
  isPublished: boolean
  disabled?: boolean
  // 按鈕文字中的內容名稱，例如「更新文章」、「更新作品」
  noun?: string
  // 排程相關的按鈕文字；未傳入時依 isPublished 顯示預設文字
  draftLabel?: string
  publishLabel?: string
}

// useFormStatus 的 data 可得知是哪個按鈕觸發送出，只在被點擊的按鈕上顯示載入狀態
export function PostSubmitButtons({
  isPublished,
  disabled,
  noun = "文章",
  draftLabel,
  publishLabel,
}: PostSubmitButtonsProps) {
  const { pending, data } = useFormStatus()

  const pendingIntent = pending ? (data?.get(INTENT_FIELD) as PostIntent | null) : null

  const renderButton = (
    intent: PostIntent,
    label: string,
    pendingLabel: string,
    variant: "default" | "outline",
    Icon: typeof SaveIcon,
  ) => {
    const isThisPending = pendingIntent === intent

    return (
      <Button
        type="submit"
        name={INTENT_FIELD}
        value={intent}
        variant={variant}
        disabled={pending || disabled}
        aria-disabled={pending}
        className="flex-1"
      >
        {isThisPending ? (
          <Loader2Icon className="animate-spin" aria-hidden />
        ) : (
          <Icon aria-hidden />
        )}
        {isThisPending ? pendingLabel : label}
      </Button>
    )
  }

  return (
    <div className="flex gap-2">
      {renderButton(
        POST_INTENT.SAVE_DRAFT,
        draftLabel ?? (isPublished ? "轉為草稿" : "儲存草稿"),
        "儲存中⋯",
        "outline",
        SaveIcon,
      )}
      {renderButton(
        POST_INTENT.PUBLISH,
        publishLabel ?? (isPublished ? `更新${noun}` : "正式發布"),
        publishLabel ? "儲存中⋯" : "發布中⋯",
        "default",
        SendIcon,
      )}
    </div>
  )
}
