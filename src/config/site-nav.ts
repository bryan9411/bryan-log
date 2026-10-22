import { ROUTES } from "@/config/routes"

export const SITE_NAV_ITEMS = [
  { href: ROUTES.POSTS, label: "技術文章" },
  { href: ROUTES.PROJECTS, label: "精選專案" },
  { href: ROUTES.ARCHIVES, label: "歸檔" },
] as const

export type SiteNavItem = (typeof SITE_NAV_ITEMS)[number]
