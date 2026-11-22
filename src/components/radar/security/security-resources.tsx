import { ExternalLink } from "@/components/site/external-link"
import {
  NVD_NOTICE,
  SECURITY_ATTRIBUTIONS,
  SECURITY_RESOURCE_GROUPS,
} from "@/config/security-resources"

// 防護資源清單：只放標題、一句自己寫的說明與連結
export function SecurityResources() {
  return (
    <section aria-labelledby="security-resources" className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h2 id="security-resources" className="text-2xl font-semibold tracking-tight">
          防護資源
        </h2>
        <p className="text-sm text-pretty text-muted-foreground">
          看完漏洞之後，可以從這些指南、教材與開源工具著手檢查自己的專案。
        </p>
      </div>
      <div className="grid gap-8 md:grid-cols-3">
        {SECURITY_RESOURCE_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-muted-foreground">{group.label}</h3>
            <ul className="flex flex-col gap-3">
              {group.items.map((item) => (
                <li key={item.href} className="flex flex-col gap-0.5">
                  <ExternalLink href={item.href} className="font-medium hover:underline">
                    {item.title}
                  </ExternalLink>
                  <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
                    {item.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

// 資料來源標示：NVD、FIRST、GitHub Advisory Database 的使用規範要求標明出處
export function SecurityAttributions() {
  return (
    <footer
      aria-label="資料來源"
      className="flex flex-col gap-3 border-t pt-6 text-xs leading-relaxed text-muted-foreground"
    >
      <p className="font-medium text-foreground/80">資料來源</p>
      <ul className="grid gap-1.5">
        {SECURITY_ATTRIBUTIONS.map((source) => (
          <li key={source.href}>
            <ExternalLink href={source.href} className="underline-offset-2 hover:underline">
              {source.label}
            </ExternalLink>
            ：{source.note}
          </li>
        ))}
      </ul>
      <p lang="en">{NVD_NOTICE}</p>
      <p>
        漏洞內容為各資料來源的英文原文，本站只整理排序，不保證完整與即時；處置前請以原廠公告為準。
      </p>
    </footer>
  )
}
