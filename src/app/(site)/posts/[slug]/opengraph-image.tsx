import {
  POST_OG_IMAGE_ALT,
  POST_OG_IMAGE_CONTENT_TYPE,
  POST_OG_IMAGE_SIZE,
  renderPostOgImage,
} from "@/lib/og/post-og-image"

export const alt = POST_OG_IMAGE_ALT
export const size = POST_OG_IMAGE_SIZE
export const contentType = POST_OG_IMAGE_CONTENT_TYPE

// 分享到社群平台時動態產生的預覽圖，內容與文章同步（共用文章快取，後台更新時一併失效）
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return renderPostOgImage(slug)
}
