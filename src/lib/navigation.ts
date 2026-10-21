// 目前路徑等於連結本身或位於其子路徑下時，視為選取中的導覽項目
export function isActiveHref(pathname: string | null, href: string) {
  if (!pathname) return false
  return pathname === href || pathname.startsWith(`${href}/`)
}
