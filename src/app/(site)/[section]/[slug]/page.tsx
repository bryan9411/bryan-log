import type { Metadata } from "next"
import { notFound, permanentRedirect } from "next/navigation"

import { PostArticle } from "@/components/posts/post-article"
import { PostNavigation } from "@/components/posts/post-navigation"
import { PostViewCount } from "@/components/posts/post-view-count"
import { ReadingProgress } from "@/components/posts/reading-progress"
import { RelatedPosts } from "@/components/posts/related-posts"
import { TLDR_CARD_CLASS } from "@/components/posts/tldr-card"
import { postDetailPath } from "@/config/routes"
import { findAdjacentPosts, findRelatedPosts } from "@/lib/content/post-neighbors"
import { getPublishedPost, getPublishedPosts } from "@/lib/data/public-posts"
import { getPublishedPostSlugs } from "@/lib/data/published-slugs"
import { createPageMetadata, serializeJsonLd } from "@/lib/seo"
import { PLACEHOLDER_SLUG } from "@/lib/static-params"
import { buildPostStructuredData } from "@/lib/structured-data"

// Next.js 16 Partial Prefetching：文章內頁屬於完整內容直出型路由，允許 blocking 導航避免未包覆 Suspense 之警告
export const instant = false

// 建置時預渲染所有已發布文章；之後新增的文章於第一次請求時渲染並保存，同樣受快取標籤控管
// Cache Components 規定至少回傳一筆，尚無文章時以不存在的代稱佔位（回應 404）
export async function generateStaticParams() {
  const posts = await getPublishedPostSlugs()
  if (posts.length === 0) return [{ section: PLACEHOLDER_SLUG, slug: PLACEHOLDER_SLUG }]
  return posts.map(({ sectionSlug, slug }) => ({ section: sectionSlug, slug }))
}

export async function generateMetadata({
  params,
}: PageProps<"/[section]/[slug]">): Promise<Metadata> {
  const { slug } = await params
  const post = await getPublishedPost(slug)

  if (!post) return { title: "找不到文章" }

  return createPageMetadata({
    path: postDetailPath(post.section.slug, slug),
    title: post.title,
    description: post.excerpt,
    hasGeneratedImage: true,
    article: {
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      section: post.section.name,
      tags: [post.parentCategory?.name, post.category?.name].filter((name) => name !== undefined),
    },
  })
}

export default async function PostPage({ params }: PageProps<"/[section]/[slug]">) {
  const { section: sectionSlug, slug } = await params
  // 文章列表已快取，前後篇與相關文章直接由列表計算，不需額外查詢
  const [post, posts] = await Promise.all([getPublishedPost(slug), getPublishedPosts()])

  if (!post) notFound()

  // 文章代稱全站唯一；文章搬到其他區塊或區塊改名後，舊網址永久轉址到正確位置
  if (post.section.slug !== sectionSlug) permanentRedirect(postDetailPath(post.section.slug, slug))

  // 上下篇與相關文章只在同一個區塊內找，技術文章不會接到旅遊心得
  const sectionPosts = posts.filter((item) => item.section.slug === post.section.slug)
  const adjacent = findAdjacentPosts(sectionPosts, slug)
  const related = findRelatedPosts(sectionPosts, slug)

  const jsonLd = buildPostStructuredData(post, `.${TLDR_CARD_CLASS}`)

  return (
    <>
      <ReadingProgress />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <PostArticle
        post={post}
        metaExtra={<PostViewCount slug={slug} initialCount={post.viewCount} />}
        footer={
          <>
            <PostNavigation {...adjacent} />
            <RelatedPosts posts={related} />
          </>
        }
      />
    </>
  )
}
