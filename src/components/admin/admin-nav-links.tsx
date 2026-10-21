"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { ADMIN_NAV_ITEMS } from "@/config/admin-nav"
import { cn } from "@/lib/utils"

export function AdminNavLinks() {
  const pathname = usePathname()

  return (
    <nav aria-label="後台導覽" className="flex gap-1 overflow-x-auto md:flex-col">
      {ADMIN_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`)

        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors",
              "hover:bg-muted hover:text-foreground",
              isActive && "bg-muted font-medium text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
