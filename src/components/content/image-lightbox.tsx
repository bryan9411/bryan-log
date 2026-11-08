"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"

import { LIGHTBOX_TRIGGER_SELECTOR } from "@/lib/content/image-lightbox"

const ImageLightboxDialog = dynamic(
  () =>
    import("@/components/content/image-lightbox-dialog").then(
      (module) => module.ImageLightboxDialog,
    ),
  { ssr: false },
)

// 首屏只掛一個點擊監聽；第一次點圖片才載入對話框，之後由對話框自己接手
export function ImageLightbox() {
  const [initialTrigger, setInitialTrigger] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (initialTrigger) return

    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return

      const trigger = event.target.closest<HTMLElement>(LIGHTBOX_TRIGGER_SELECTOR)
      if (trigger) setInitialTrigger(trigger)
    }

    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [initialTrigger])

  if (!initialTrigger) return null

  return <ImageLightboxDialog initialTrigger={initialTrigger} />
}
