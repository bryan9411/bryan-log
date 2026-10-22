"use client"

import { useDeferredValue, useMemo } from "react"
import type { JSONContent } from "@tiptap/react"
import { SearchCheckIcon, SparklesIcon } from "lucide-react"

import { ContentChecklist } from "@/components/admin/posts/content-checklist"
import { runGeoChecks } from "@/lib/content/geo-check"
import { runSeoChecks } from "@/lib/content/seo-check"
import { parseTldrLines } from "@/lib/validations/post"

type PostHealthChecksProps = {
  title: string
  slug: string
  excerpt: string
  // 編輯器中的原始多行文字
  tldr: string
  categoryId: string | null
  coverImageUrl: string | null
  content: JSONContent | null
}

// 即時 SEO 與 GEO 健檢：輸入先以 useDeferredValue 延後，打字時以低優先順序重新計算，長文也不會拖慢編輯器
export function PostHealthChecks(props: PostHealthChecksProps) {
  const deferred = useDeferredValue(props)

  const seoChecks = useMemo(() => runSeoChecks(deferred), [deferred])
  const geoChecks = useMemo(
    () =>
      runGeoChecks({
        tldr: parseTldrLines(deferred.tldr),
        content: deferred.content,
        categoryId: deferred.categoryId,
      }),
    [deferred],
  )

  return (
    <>
      <ContentChecklist title="SEO 健檢" icon={SearchCheckIcon} checks={seoChecks} />
      <ContentChecklist title="GEO 健檢（AI 搜尋）" icon={SparklesIcon} checks={geoChecks} />
    </>
  )
}
