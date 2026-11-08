"use client"

import { Dialog } from "radix-ui"

import { SearchPanel } from "@/components/search/search-panel"
import { DialogOverlay } from "@/components/ui/dialog"

type SearchDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  returnFocusRef: React.RefObject<HTMLButtonElement | null>
}

// 面板內容只在開啟時掛載，每次開啟都是乾淨的狀態
export function SearchDialog({ open, onOpenChange, returnFocusRef }: SearchDialogProps) {
  // 觸發按鈕不在 Radix 的管理範圍內，關閉時自行把焦點還給它
  const handleCloseAutoFocus = (event: Event) => {
    event.preventDefault()
    returnFocusRef.current?.focus()
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <DialogOverlay />
        <Dialog.Content
          onCloseAutoFocus={handleCloseAutoFocus}
          aria-describedby={undefined}
          className="site-theme fixed top-[12svh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-2xl data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <Dialog.Title className="sr-only">搜尋文章</Dialog.Title>
          <SearchPanel onNavigate={() => onOpenChange(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
