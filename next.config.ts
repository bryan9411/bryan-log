import type { NextConfig } from "next"

type RemotePatterns = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>

const SUPABASE_STORAGE_PATHNAME = "/storage/v1/object/public/**"

// 依環境變數精準鎖定 Supabase 專案網域，未設定時退回官方雲端網域萬用字元
function buildSupabaseImagePatterns(): RemotePatterns {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!supabaseUrl) {
    return [{ protocol: "https", hostname: "*.supabase.co", pathname: SUPABASE_STORAGE_PATHNAME }]
  }

  const { protocol, hostname, port } = new URL(supabaseUrl)

  return [
    {
      protocol: protocol === "http:" ? "http" : "https",
      hostname,
      port,
      pathname: SUPABASE_STORAGE_PATHNAME,
    },
  ]
}

const nextConfig: NextConfig = {
  typedRoutes: true,
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  images: {
    remotePatterns: buildSupabaseImagePatterns(),
    // 上傳的檔名都是 UUID，內容不會變動，最佳化結果可長期保存，不必反覆重新產生
    minimumCacheTTL: 31_536_000,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
}

export default nextConfig
