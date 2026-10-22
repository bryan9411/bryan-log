"use client"

import { ErrorContent, type ErrorContentProps } from "@/components/site/error-content"
import { SiteContainer } from "@/components/site/site-container"
import { siteConfig } from "@/config/site"

import "./globals.css"

// 根版型崩潰時取代整份文件：需自備 <html>、<body> 與全域樣式，且不支援 metadata，改用 <title>
// 此時 next-themes 尚未運作，配色以前台淺色主題呈現
export default function GlobalError({ error, retry }: ErrorContentProps) {
  return (
    <html lang={siteConfig.locale}>
      <body className="site-theme flex min-h-svh flex-col bg-background text-foreground antialiased">
        <title>{`發生錯誤｜${siteConfig.name}`}</title>
        <SiteContainer className="flex flex-1 flex-col">
          <ErrorContent error={error} retry={retry} />
        </SiteContainer>
      </body>
    </html>
  )
}
