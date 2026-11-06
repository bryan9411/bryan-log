import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import { SpeedInsights } from "@/components/analytics/speed-insights"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { siteConfig } from "@/config/site"
import { FONT_SIZE_INIT_SCRIPT } from "@/lib/constants/font-size"
import { createPageMetadata } from "@/lib/seo"
import { cn } from "@/lib/utils"

import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

// 全站預設值：metadataBase 讓 canonical 與 og:url 等相對路徑自動補成完整網址
export const metadata: Metadata = {
  ...createPageMetadata({}),
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.author, url: siteConfig.url }],
  creator: siteConfig.author,
  title: {
    default: siteConfig.title,
    template: `%s｜${siteConfig.name}`,
  },
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // next-themes 會在客戶端改寫 <html> 的 class，必須加上 suppressHydrationWarning
    <html
      lang={siteConfig.locale}
      suppressHydrationWarning
      className={cn(geistSans.variable, geistMono.variable, "h-full antialiased")}
    >
      <head>
        {/* 於首次繪製前套用已儲存的字級，避免載入時字級閃動；會改寫 <html> 屬性，同樣仰賴 suppressHydrationWarning */}
        <script dangerouslySetInnerHTML={{ __html: FONT_SIZE_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          {children}
          <Toaster position="bottom-center" />
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  )
}
