import type { MetadataRoute } from "next"

import { API_ROOT, ROUTES } from "@/config/routes"
import { absoluteUrl } from "@/lib/seo"

// 後台與 API 不應被索引；後台另有 noindex meta 與 X-Robots-Tag 回應標頭作為第二層保護
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ROUTES.HOME,
      // robots 規則採前綴比對，"/admin" 同時涵蓋 /admin 與其下所有路徑
      disallow: [ROUTES.ADMIN, `${API_ROOT}/`],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl(ROUTES.HOME),
  }
}
