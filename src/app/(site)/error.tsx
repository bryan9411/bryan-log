"use client"

import { ErrorContent, type ErrorContentProps } from "@/components/site/error-content"
import { SiteContainer } from "@/components/site/site-container"

// 前台頁面的錯誤邊界：位於 (site) 版型之內，頁首與頁尾維持可用，讀者仍可從導覽列離開
export default function SiteError({ error, retry }: ErrorContentProps) {
  return (
    <SiteContainer className="flex flex-1 flex-col">
      <ErrorContent error={error} retry={retry} />
    </SiteContainer>
  )
}
