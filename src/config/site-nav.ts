import type { Route } from "next"

import { ROUTES, sectionPath } from "@/config/routes"
import type { Section } from "@/lib/data/sections"

export type SiteNavLink = {
  href: Route
  label: string
  description?: string | null
}

// 下拉群組：桌面版收合成選單，行動版展開成帶標題的子清單
export type SiteNavGroup = {
  label: string
  items: SiteNavLink[]
}

export type SiteNavItem = SiteNavLink | SiteNavGroup

export function isSiteNavGroup(item: SiteNavItem): item is SiteNavGroup {
  return "items" in item
}

// 區塊數量超過此值時收進「文章」下拉，避免導覽列隨區塊增加而擠滿
const MAX_INLINE_SECTIONS = 1

const SECTION_GROUP_LABEL = "文章"

// 固定在內容區塊之後的導覽項目
const FIXED_NAV_ITEMS: SiteNavLink[] = [
  { href: ROUTES.PROJECTS, label: "精選專案" },
  { href: ROUTES.ARCHIVES, label: "歸檔" },
]

// 內容區塊依後台設定的排序排列，作品集與歸檔固定在最後
export function buildSiteNavItems(
  sections: Pick<Section, "name" | "slug" | "description">[],
): SiteNavItem[] {
  const sectionLinks = sections.map(({ name, slug, description }) => ({
    href: sectionPath(slug),
    label: name,
    description,
  }))
  const sectionItems: SiteNavItem[] =
    sectionLinks.length > MAX_INLINE_SECTIONS
      ? [{ label: SECTION_GROUP_LABEL, items: sectionLinks }]
      : sectionLinks

  return [...sectionItems, ...FIXED_NAV_ITEMS]
}

// 頁尾空間充足，所有連結攤平列出
export function flattenSiteNavItems(items: SiteNavItem[]): SiteNavLink[] {
  return items.flatMap((item) => (isSiteNavGroup(item) ? item.items : [item]))
}
