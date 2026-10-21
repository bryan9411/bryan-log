import {
  FileTextIcon,
  FolderKanbanIcon,
  FolderTreeIcon,
  HardDriveIcon,
  LayoutDashboardIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { Route } from "next"

import { ROUTES } from "@/config/routes"

export type AdminNavItem = {
  href: Route
  label: string
  icon: LucideIcon
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: ROUTES.ADMIN_DASHBOARD, label: "管理儀表板", icon: LayoutDashboardIcon },
  { href: ROUTES.ADMIN_POSTS, label: "文章管理", icon: FileTextIcon },
  { href: ROUTES.ADMIN_PROJECTS, label: "專案管理", icon: FolderKanbanIcon },
  { href: ROUTES.ADMIN_CATEGORIES, label: "分類管理", icon: FolderTreeIcon },
  { href: ROUTES.ADMIN_STORAGE, label: "空間清理", icon: HardDriveIcon },
]
