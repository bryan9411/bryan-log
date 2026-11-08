"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"
import { SearchIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { preloadSearchIndex } from "@/hooks/use-search-index"
import { useShortcutModifier } from "@/hooks/use-shortcut-modifier"

const SHORTCUT_KEY = "k"

const loadSearchDialog = () => import("@/components/search/search-dialog")

const SearchDialog = dynamic(() => loadSearchDialog().then((module) => module.SearchDialog), {
  ssr: false,
})

// 滑鼠移到按鈕上就先下載面板與索引，點開時通常已經可以直接搜尋
function preloadSearch() {
  preloadSearchIndex()
  void loadSearchDialog()
}

// 導覽列搜尋按鈕與 Cmd／Ctrl + K 全域快捷鍵；對話框與搜尋程式等第一次開啟才載入
export function SearchCommand() {
  const [isOpen, setIsOpen] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const modifier = useShortcutModifier()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== SHORTCUT_KEY || !(event.metaKey || event.ctrlKey)) return
      if (event.repeat) return

      event.preventDefault()
      setHasOpened(true)
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
    <>
      <Button
        variant="ghost"
        aria-label="搜尋文章"
        title={shortcutLabel ? `搜尋文章（${shortcutLabel}）` : "搜尋文章"}
        ref={buttonRef}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onPointerEnter={preloadSearch}
        onFocus={preloadSearch}
        onClick={() => {
          setHasOpened(true)
          setIsOpen(true)
        }}
        className="size-8 px-0 text-muted-foreground lg:w-52 lg:justify-start lg:gap-2 lg:border lg:border-border lg:bg-muted/40 lg:px-2.5 lg:font-normal"
      >
        <SearchIcon />
        <span className="hidden lg:inline">搜尋文章⋯⋯</span>
        {maybeRenderShortcut()}
      </Button>
      {hasOpened ? (
        <SearchDialog open={isOpen} onOpenChange={setIsOpen} returnFocusRef={buttonRef} />
      ) : null}
    </>
  )
}
