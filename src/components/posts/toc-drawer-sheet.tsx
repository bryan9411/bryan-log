"use client"

import {
  Sheet,
  SHEET_SIDE,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

type TocDrawerSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCloseAutoFocus: (event: Event) => void
  children: React.ReactNode
}

// 行動版目錄抽屜：第一次開啟時才載入
export function TocDrawerSheet({
  open,
  onOpenChange,
  onCloseAutoFocus,
  children,
}: TocDrawerSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={SHEET_SIDE.BOTTOM}
        className="site-theme"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <SheetHeader>
          <SheetTitle>文章目錄</SheetTitle>
          <SheetDescription>點選章節即可跳轉</SheetDescription>
        </SheetHeader>
        <nav
          aria-label="文章目錄（行動版）"
          className="overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        >
          {children}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
