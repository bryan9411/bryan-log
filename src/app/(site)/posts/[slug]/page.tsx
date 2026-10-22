import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { PostArticle } from "@/components/posts/post-article"
import { PostViewCount } from "@/components/posts/post-view-count"
import { ReadingProgress } from "@/components/posts/reading-progress"
import { postDetailPath } from "@/config/routes"
import { siteConfig } from "@/config/site"
import { getPublishedPost } from "@/lib/data/public-posts"
import { getPublishedPostSlugs } from "@/lib/data/published-slugs"
import { absoluteUrl, createPageMetadata, serializeJsonLd } from "@/lib/seo"
import { toSlugParams } from "@/lib/static-params"

// Next.js 16 Partial Prefetching：文章內頁屬於完整內容直出型路由，允許 blocking 導航避免未包覆 Suspense 之警告
export const instant = false

// 建置時預渲染所有已發布文章；之後新增的文章於第一次請求時渲染並保存，同樣受快取標籤控管
export async function generateStaticParams() {
  return toSlugParams(await getPublishedPostSlugs())
}

export async function generateMetadata({ params }: PageProps<"/posts/[slug]">): Promise<Metadata> {
  const { slug } = await params
  const post = await getPublishedPost(slug)

  if (!post) return { title: "找不到文章" }

  return createPageMetadata({
    path: postDetailPath(slug),
    title: post.title,
    description: post.excerpt,
    hasGeneratedImage: true,
    article: {
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      section: post.parentCategory?.name ?? post.category?.name,
      tags: [post.parentCategory?.name, post.category?.name].filter((name) => name !== undefined),
    },
  })
}

export default async function PostPage({ params }: PageProps<"/posts/[slug]">) {
  const { slug } = await params
  const post = await getPublishedPost(slug)

  if (!post) notFound()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: post.coverImageUrl ?? undefined,
    datePublished: post.publishedAt ?? undefined,
    dateModified: post.updatedAt,
    inLanguage: siteConfig.locale,
    url: absoluteUrl(postDetailPath(slug)),
    author: { "@type": "Person", name: siteConfig.author, url: siteConfig.url },
  }

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
      />
    </>
  )
}
