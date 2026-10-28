import {
  FileTextIcon,
  FolderKanbanIcon,
  FolderTreeIcon,
  HardDriveIcon,
  LayoutDashboardIcon,
  TagsIcon,
  WrenchIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { Route } from "next"

import { ROUTES } from "@/config/routes"

export type AdminNavItem = {
  href: Route
  label: string
  icon: LucideIcon
}

export type AdminNavGroup = {
  // 沒有標題的群組直接列出項目，例如儀表板
  label: string | null
  items: AdminNavItem[]
}

// 文章與作品集各自一組，兩組結構對稱：內容管理 + 分類
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: null,
    items: [{ href: ROUTES.ADMIN_DASHBOARD, label: "管理儀表板", icon: LayoutDashboardIcon }],
  },
  {
    label: "文章",
    items: [
      { href: ROUTES.ADMIN_POSTS, label: "文章管理", icon: FileTextIcon },
      { href: ROUTES.ADMIN_POST_CATEGORIES, label: "文章分類", icon: FolderTreeIcon },
    ],
  },
  {
    label: "作品集",
    items: [
      { href: ROUTES.ADMIN_PROJECTS, label: "專案管理", icon: FolderKanbanIcon },
      { href: ROUTES.ADMIN_PROJECT_CATEGORIES, label: "專案分類", icon: TagsIcon },
    ],
  },
  {
    label: "站務",
    items: [
      { href: ROUTES.ADMIN_STORAGE, label: "空間清理", icon: HardDriveIcon },
      { href: ROUTES.ADMIN_TOOLS, label: "站務工具", icon: WrenchIcon },
    ],
  },
]

export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV_GROUPS.flatMap(({ items }) => items)
