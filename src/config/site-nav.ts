import type { Route } from "next"

import { ROUTES, sectionPath } from "@/config/routes"
import type { PublicRadarModule } from "@/lib/data/public-radar"
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

const PROJECTS_NAV_ITEM: SiteNavLink = { href: ROUTES.PROJECTS, label: "精選專案" }
const ARCHIVES_NAV_ITEM: SiteNavLink = { href: ROUTES.ARCHIVES, label: "歸檔" }

const RADAR_GROUP_LABEL = "週榜"

type RadarNavModule = Pick<PublicRadarModule, "label" | "description" | "href">

// 公開的雷達模組：沒有就不顯示；只有一個時直接連到該榜單；兩個以上收進「週榜」下拉並附上總覽
function buildRadarNavItems(modules: RadarNavModule[]): SiteNavItem[] {
  if (modules.length === 0) return []
  if (modules.length === 1) {
    const [{ href, label, description }] = modules
    return [{ href, label, description }]
  }

  return [
    {
      label: RADAR_GROUP_LABEL,
      items: [
        { href: ROUTES.RADAR, label: "週榜總覽", description: "所有榜單的前幾名" },
        ...modules.map(({ href, label, description }) => ({ href, label, description })),
      ],
    },
  ]
}

// 內容區塊依後台設定的排序排列，之後依序為作品集、週榜與歸檔
export function buildSiteNavItems(
  sections: Pick<Section, "name" | "slug" | "description">[],
  radarModules: RadarNavModule[] = [],
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

  return [
    ...sectionItems,
    PROJECTS_NAV_ITEM,
    ...buildRadarNavItems(radarModules),
    ARCHIVES_NAV_ITEM,
  ]
}

const FOOTER_SITE_GROUP_LABEL = "網站"

// 頁尾以分欄呈現：導覽列的下拉群組各自一欄，其餘單一連結集中到「網站」欄
// 只有一個區塊時沒有群組，該區塊會和作品集、歸檔一起放在「網站」欄
export function buildFooterNavGroups(items: SiteNavItem[]): SiteNavGroup[] {
  const groups = items.filter(isSiteNavGroup)
  const links = items.filter((item): item is SiteNavLink => !isSiteNavGroup(item))

  return [...groups, { label: FOOTER_SITE_GROUP_LABEL, items: links }]
}
