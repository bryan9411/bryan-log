"use client"

import { useEffect, useId, useState } from "react"
import { MenuIcon, XIcon } from "lucide-react"

import { SiteContainer } from "@/components/site/site-container"
import { SiteNavLinks } from "@/components/site/site-nav-links"
import { Button } from "@/components/ui/button"
import type { SiteNavItem } from "@/config/site-nav"

const ESCAPE_KEY = "Escape"

// 選單面板以絕對定位貼齊頁首下緣，因此頁首必須是定位元素（sticky 即可）
// 頁首本身已有 backdrop-filter，巢狀元素的模糊不會生效，面板因此使用不透明背景
type MobileNavProps = {
  items: SiteNavItem[]
}

export function MobileNav({ items }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const panelId = useId()

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === ESCAPE_KEY) setIsOpen(false)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  const menuLabel = isOpen ? "關閉選單" : "開啟選單"

  const closeMenu = () => setIsOpen(false)

  const maybeRenderPanel = () => {
    if (!isOpen) return null

    return (
      <nav
        id={panelId}
        aria-label="行動版主選單"
        className="absolute inset-x-0 top-full animate-in border-b bg-background shadow-sm fade-in slide-in-from-top-2"
      >
        <SiteContainer className="py-3">
          <SiteNavLinks items={items} orientation="vertical" onNavigate={closeMenu} />
        </SiteContainer>
      </nav>
    )
  }

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-label={menuLabel}
        title={menuLabel}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? <XIcon /> : <MenuIcon />}
      </Button>
      {maybeRenderPanel()}
    </div>
  )
}
