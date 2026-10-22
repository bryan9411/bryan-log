"use client"

import Link from "next/link"
import { useEffect } from "react"
import { HouseIcon, RotateCcwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ROUTES } from "@/config/routes"
import { cn } from "@/lib/utils"

export type ErrorContentProps = {
  error: unknown
  retry: () => void
  className?: string
}

// 伺服器元件拋出的錯誤在正式環境只會帶有 digest，訊息本身不會傳到瀏覽器；
// 顯示 digest 讓讀者回報時可對照伺服器日誌，不洩漏任何內部細節
function getErrorDigest(error: unknown) {
  if (error instanceof Error && "digest" in error && typeof error.digest === "string") {
    return error.digest
  }
  return null
}

export function ErrorContent({ error, retry, className }: ErrorContentProps) {
  const digest = getErrorDigest(error)

  useEffect(() => {
    console.error(error)
  }, [error])

  const maybeRenderDigest = () => {
    if (!digest) return null

    return (
      <p className="font-mono text-xs text-muted-foreground">
        錯誤代碼：<span className="select-all">{digest}</span>
      </p>
    )
  }

  return (
    <div
      role="alert"
      className={cn("flex flex-1 flex-col items-start justify-center gap-4 py-24", className)}
    >
      <p className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
        <span className="relative flex size-2" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive/60" />
          <span className="relative inline-flex size-2 rounded-full bg-destructive" />
        </span>
        500
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">頁面暫時出了點狀況</h1>
      <p className="max-w-xl leading-relaxed text-pretty text-muted-foreground">
        伺服器在處理這個頁面時發生錯誤，可能只是短暫的連線問題。請稍候再試一次，或先回到首頁瀏覽其他內容。
      </p>
      {maybeRenderDigest()}
      <div className="mt-2 flex flex-wrap gap-3">
        <Button onClick={retry}>
          <RotateCcwIcon data-icon="inline-start" aria-hidden />
          重試
        </Button>
        <Button asChild variant="outline">
          <Link href={ROUTES.HOME}>
            <HouseIcon data-icon="inline-start" aria-hidden />
            回首頁
          </Link>
        </Button>
      </div>
    </div>
  )
}
