"use client"

import { useEffect, useState } from "react"
import { Dialog } from "radix-ui"
import { SearchIcon } from "lucide-react"

import { SearchPanel } from "@/components/search/search-panel"
import { Button } from "@/components/ui/button"
import { DialogOverlay } from "@/components/ui/dialog"
import { preloadSearchIndex } from "@/hooks/use-search-index"
import { useShortcutModifier } from "@/hooks/use-shortcut-modifier"

const SHORTCUT_KEY = "k"

// 導覽列搜尋按鈕與 Cmd／Ctrl + K 全域快捷鍵；面板內容只在開啟時掛載，每次開啟都是乾淨的狀態
export function SearchCommand() {
  const [isOpen, setIsOpen] = useState(false)
  const modifier = useShortcutModifier()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== SHORTCUT_KEY || !(event.metaKey || event.ctrlKey)) return
      if (event.repeat) return

      event.preventDefault()
      setIsOpen((open) => !open)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const shortcutLabel = modifier ? `${modifier} K` : null

  const maybeRenderShortcut = () => {
    if (!shortcutLabel) return null

    return (
      <kbd className="ml-auto hidden rounded border bg-background px-1.5 font-sans text-[0.7rem] text-muted-foreground lg:inline">
        {shortcutLabel}
      </kbd>
    )
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <Button
          variant="ghost"
          aria-label="搜尋文章"
          title={shortcutLabel ? `搜尋文章（${shortcutLabel}）` : "搜尋文章"}
          // 滑鼠移到按鈕上就先下載索引，點開時通常已經可以直接搜尋
          onPointerEnter={preloadSearchIndex}
          onFocus={preloadSearchIndex}
          className="size-8 px-0 text-muted-foreground lg:w-52 lg:justify-start lg:gap-2 lg:border lg:border-border lg:bg-muted/40 lg:px-2.5 lg:font-normal"
        >
          <SearchIcon />
          <span className="hidden lg:inline">搜尋文章⋯⋯</span>
          {maybeRenderShortcut()}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <DialogOverlay />
        <Dialog.Content
          aria-describedby={undefined}
          className="site-theme fixed top-[12svh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-2xl data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <Dialog.Title className="sr-only">搜尋文章</Dialog.Title>
          <SearchPanel onNavigate={() => setIsOpen(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
