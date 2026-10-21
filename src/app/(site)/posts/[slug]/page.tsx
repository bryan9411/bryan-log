import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { BackLink } from "@/components/content/back-link"
import { CoverImage } from "@/components/content/cover-image"
import { RichContent } from "@/components/content/rich-content"
import { PostMeta } from "@/components/posts/post-meta"
import { SiteContainer } from "@/components/site/site-container"
import { postDetailPath, ROUTES } from "@/config/routes"
import { siteConfig } from "@/config/site"
import { getPublishedPost } from "@/lib/data/public-posts"
import { getPublishedPostSlugs } from "@/lib/data/published-slugs"
import { absoluteUrl, createPageMetadata, serializeJsonLd } from "@/lib/seo"
import { toSlugParams } from "@/lib/static-params"

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
    image: post.coverImageUrl,
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

  const maybeRenderExcerpt = () => {
    if (!post.excerpt) return null
    return (
      <p className="text-lg leading-relaxed text-pretty text-muted-foreground">{post.excerpt}</p>
    )
  }

  const maybeRenderCover = () => {
    if (!post.coverImageUrl) return null
    return <CoverImage src={post.coverImageUrl} alt={post.title} />
  }

  return (
    <SiteContainer className="max-w-3xl py-10 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <article className="flex flex-col gap-8">
        <header className="flex flex-col gap-5">
          <BackLink href={ROUTES.POSTS} label="所有文章" />
          <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl sm:leading-tight">
            {post.title}
          </h1>
          {maybeRenderExcerpt()}
          <PostMeta post={post} className="border-y border-border/60 py-3 text-sm" />
        </header>
        {maybeRenderCover()}
        <RichContent html={post.html} />
      </article>
    </SiteContainer>
  )
}
