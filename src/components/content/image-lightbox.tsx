"use client"

import { useEffect, useRef, useState } from "react"
import { Dialog } from "radix-ui"
import { ChevronLeftIcon, ChevronRightIcon, XIcon, ZoomInIcon, ZoomOutIcon } from "lucide-react"

import { LIGHTBOX_TRIGGER_SELECTOR } from "@/lib/content/image-lightbox"
import { cn } from "@/lib/utils"

const ARTICLE_SELECTOR = ".article-content"
const SWIPE_MIN_DISTANCE = 50
// 點擊圖片與按鈕以外的空白處即關閉，與點擊遮罩的直覺一致
const INTERACTIVE_SELECTOR = "img, button"

const KEY = {
  ARROW_LEFT: "ArrowLeft",
  ARROW_RIGHT: "ArrowRight",
} as const

type LightboxImage = {
  src: string
  alt: string
}

type LightboxState = {
  images: LightboxImage[]
  index: number
}

// 同一篇內文的所有圖片組成一組，可在燈箱內以左右鍵、按鈕或滑動切換
function collectImages(trigger: Element): LightboxState | null {
  const article = trigger.closest(ARTICLE_SELECTOR)
  if (!article) return null

  const triggers = [...article.querySelectorAll(LIGHTBOX_TRIGGER_SELECTOR)]
  const images = triggers.flatMap((element) => {
    const image = element.querySelector("img")
    // currentSrc 為瀏覽器實際選用的來源（含 srcset），燈箱可直接使用已下載的圖片
    return image ? [{ src: image.currentSrc || image.src, alt: image.alt }] : []
  })

  const index = triggers.indexOf(trigger)
  return images.length > 0 && index >= 0 ? { images, index } : null
}

// 文章內文由伺服器以 HTML 輸出，圖片已包在燈箱按鈕內；這裡以單一委派監聽開啟燈箱
export function ImageLightbox() {
  const touchStartX = useRef<number | null>(null)
  // 燈箱由委派監聽開啟，Radix 不知道觸發來源，關閉時需自行把焦點還給原本的圖片按鈕
  const triggerRef = useRef<HTMLElement | null>(null)
  const [state, setState] = useState<LightboxState | null>(null)
  const [isZoomed, setIsZoomed] = useState(false)

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return

      const trigger = event.target.closest<HTMLElement>(LIGHTBOX_TRIGGER_SELECTOR)
      if (!trigger) return

      const next = collectImages(trigger)
      if (!next) return

      event.preventDefault()
      triggerRef.current = trigger
      setIsZoomed(false)
      setState(next)
    }

    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [])

  const imageCount = state?.images.length ?? 0
  const current = state ? state.images[state.index] : null
  const hasMultiple = imageCount > 1

  const go = (step: number) => {
    if (!hasMultiple) return
    setIsZoomed(false)
    setState((previous) =>
      previous
        ? { ...previous, index: (previous.index + step + imageCount) % imageCount }
        : previous,
    )
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) setState(null)
  }

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target instanceof Element && !event.target.closest(INTERACTIVE_SELECTOR)) {
      setState(null)
    }
  }

  const handleCloseAutoFocus = (event: Event) => {
    event.preventDefault()
    triggerRef.current?.focus()
    triggerRef.current = null
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === KEY.ARROW_LEFT) go(-1)
    else if (event.key === KEY.ARROW_RIGHT) go(1)
  }

  // 手機上左右滑動切換圖片；放大檢視時滑動用於捲動圖片，不切換
  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = isZoomed ? null : event.touches[0].clientX
  }

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const distance = event.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(distance) >= SWIPE_MIN_DISTANCE) go(distance < 0 ? 1 : -1)
  }

  const renderIconButton = (
    label: string,
    onClick: () => void,
    icon: React.ReactNode,
    className?: string,
  ) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/70",
        className,
      )}
    >
      {icon}
    </button>
  )

  const maybeRenderNavigation = () => {
    if (!hasMultiple) return null

    return (
      <>
        {renderIconButton(
          "上一張",
          () => go(-1),
          <ChevronLeftIcon className="size-5" aria-hidden />,
          "absolute top-1/2 left-3 hidden -translate-y-1/2 sm:flex",
        )}
        {renderIconButton(
          "下一張",
          () => go(1),
          <ChevronRightIcon className="size-5" aria-hidden />,
          "absolute top-1/2 right-3 hidden -translate-y-1/2 sm:flex",
        )}
      </>
    )
  }

  const maybeRenderCaption = () => {
    if (!current?.alt && !hasMultiple) return null

    return (
      <div className="flex max-w-3xl items-baseline justify-center gap-3 px-4 text-center text-sm text-white/80">
        {current?.alt && <p className="text-pretty">{current.alt}</p>}
        {hasMultiple && (
          <p className="shrink-0 font-mono text-xs text-white/60 tabular-nums">
            {(state?.index ?? 0) + 1} / {imageCount}
          </p>
        )}
      </div>
    )
  }

  const maybeRenderImage = () => {
    if (!current) return null

    return (
      // 放大時改為原始尺寸並可捲動檢視細節；再點一次回到符合視窗大小
      <div
        className={cn(
          "flex min-h-0 w-full flex-1 overscroll-contain",
          isZoomed ? "overflow-auto" : "items-center justify-center overflow-hidden",
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* 圖片來源為文章內已顯示的圖片（可能來自任意已清理過的網址），因此使用原生 img 而非 next/image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={current.src}
          src={current.src}
          alt={current.alt}
          onClick={() => setIsZoomed((zoomed) => !zoomed)}
          className={cn(
            "m-auto animate-in rounded-lg duration-200 fade-in-0 select-none zoom-in-95",
            isZoomed
              ? "max-w-none cursor-zoom-out"
              : "max-h-full max-w-full cursor-zoom-in object-contain",
          )}
        />
      </div>
    )
  }

  return (
    <Dialog.Root open={state !== null} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          onKeyDown={handleKeyDown}
          onCloseAutoFocus={handleCloseAutoFocus}
          onClick={handleBackdropClick}
          className="fixed inset-0 z-50 flex flex-col items-center gap-3 p-4 pt-16 pb-6 outline-none sm:px-16"
        >
          <Dialog.Title className="sr-only">
            {current?.alt ? `圖片檢視：${current.alt}` : "圖片檢視"}
          </Dialog.Title>
          <div className="absolute top-3 right-3 flex gap-2">
            {renderIconButton(
              isZoomed ? "符合視窗大小" : "檢視原始尺寸",
              () => setIsZoomed((zoomed) => !zoomed),
              isZoomed ? (
                <ZoomOutIcon className="size-5" aria-hidden />
              ) : (
                <ZoomInIcon className="size-5" aria-hidden />
              ),
            )}
            <Dialog.Close asChild>
              {renderIconButton("關閉", () => undefined, <XIcon className="size-5" aria-hidden />)}
            </Dialog.Close>
          </div>
          {maybeRenderImage()}
          {maybeRenderCaption()}
          {maybeRenderNavigation()}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
