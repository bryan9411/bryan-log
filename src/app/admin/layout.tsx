import type { Metadata } from "next"

export const metadata: Metadata = {
  title: {
    default: "管理後台",
    template: "%s｜管理後台",
  },
  robots: { index: false, follow: false },
}

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <div className="flex min-h-full flex-1 flex-col bg-muted/40">{children}</div>
}
