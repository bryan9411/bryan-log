"use client"

import { Dialog as SheetPrimitive } from "radix-ui"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// 以 Radix Dialog 實作的側邊／底部抽屜，焦點鎖定、Esc 關閉與捲動鎖定皆由 Radix 處理
const Sheet = SheetPrimitive.Root
const SheetTrigger = SheetPrimitive.Trigger
const SheetClose = SheetPrimitive.Close

const SHEET_SIDE = {
  BOTTOM: "bottom",
  RIGHT: "right",
} as const

type SheetSide = (typeof SHEET_SIDE)[keyof typeof SHEET_SIDE]

const SIDE_CLASS: Record<SheetSide, string> = {
  [SHEET_SIDE.BOTTOM]:
    "inset-x-0 bottom-0 max-h-[80svh] rounded-t-2xl border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
  [SHEET_SIDE.RIGHT]:
    "inset-y-0 right-0 h-full w-3/4 max-w-sm border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
}

type SheetContentProps = React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: SheetSide
}

function SheetContent({
  className,
  children,
  side = SHEET_SIDE.RIGHT,
  ...props
}: SheetContentProps) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <SheetPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-popover text-popover-foreground shadow-2xl transition ease-out data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:animate-in data-[state=open]:duration-300",
          SIDE_CLASS[side],
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close
          aria-label="關閉"
          className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <XIcon className="size-4" aria-hidden />
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("grid gap-1 px-5 pt-5 pr-12", className)} {...props} />
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title className={cn("font-semibold", className)} {...props} />
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SHEET_SIDE,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
}
