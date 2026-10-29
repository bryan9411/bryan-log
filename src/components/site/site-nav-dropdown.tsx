"use client"

import Link from "next/link"
import { useEffect, useId, useRef, useState } from "react"
import { ChevronDownIcon } from "lucide-react"

import type { SiteNavGroup } from "@/config/site-nav"
import { isActiveHref } from "@/lib/navigation"
import { cn } from "@/lib/utils"

const ESCAPE_KEY = "Escape"

type SiteNavDropdownProps = {
  group: SiteNavGroup
  pathname: string | null
  onNavigate?: () => void
}

// 揭露式選單（disclosure）：按鈕切換一組連結，點擊外部、按 Esc 或選取連結後收合
export function SiteNavDropdown({ group, pathname, onNavigate }: SiteNavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const isGroupActive = group.items.some(({ href }) => isActiveHref(pathname, href))

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== ESCAPE_KEY) return
      setIsOpen(false)
      buttonRef.current?.focus()
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  // 鍵盤使用者以 Tab 離開選單時一併收合
  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false)
  }

  const handleNavigate = () => {
    setIsOpen(false)
    onNavigate?.()
  }

  const maybeRenderPanel = () => {
    if (!isOpen) return null

    return (
      <ul
        id={panelId}
        className="absolute top-full left-0 z-50 mt-2 w-72 animate-in rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lg fade-in slide-in-from-top-1"
      >
        {group.items.map(({ href, label, description }) => {
          const isActive = isActiveHref(pathname, href)

          return (
            <li key={href}>
              <Link
                href={href}
                onClick={handleNavigate}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col gap-0.5 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                  isActive && "bg-muted",
                )}
              >
                <span className="text-sm font-medium text-foreground">{label}</span>
                {description ? (
                  <span className="line-clamp-1 text-xs text-muted-foreground">{description}</span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div ref={containerRef} className="relative" onBlur={handleBlur}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          "flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
          (isOpen || isGroupActive) && "text-foreground",
          isGroupActive && "font-medium",
        )}
      >
        {group.label}
        <ChevronDownIcon
          aria-hidden
          className={cn("size-3.5 transition-transform", isOpen && "rotate-180")}
        />
      </button>
      {maybeRenderPanel()}
    </div>
  )
}
