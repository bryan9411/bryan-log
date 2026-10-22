"use client"

import { ErrorContent, type ErrorContentProps } from "@/components/site/error-content"
import { SiteContainer } from "@/components/site/site-container"

// 前台以外（例如後台）的錯誤邊界；根版型本身的錯誤由 global-error 處理
export default function RootError({ error, retry }: ErrorContentProps) {
  return (
    <SiteContainer className="flex min-h-svh flex-1 flex-col">
      <ErrorContent error={error} retry={retry} />
    </SiteContainer>
  )
}
