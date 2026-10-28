import type { Route } from "next"

import { ROUTES, sectionPath } from "@/config/routes"
import type { Section } from "@/lib/data/sections"

export type SiteNavItem = {
  href: Route
  label: string
}

// 固定在內容區塊之後的導覽項目
const FIXED_NAV_ITEMS: SiteNavItem[] = [
  { href: ROUTES.PROJECTS, label: "精選專案" },
  { href: ROUTES.ARCHIVES, label: "歸檔" },
]

// 每個內容區塊各自一個導覽項目，依後台設定的排序排列，作品集與歸檔固定在最後
export function buildSiteNavItems(sections: Pick<Section, "name" | "slug">[]): SiteNavItem[] {
  return [
    ...sections.map(({ name, slug }) => ({ href: sectionPath(slug), label: name })),
    ...FIXED_NAV_ITEMS,
  ]
}
