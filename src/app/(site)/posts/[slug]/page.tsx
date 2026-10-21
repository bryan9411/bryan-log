import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { BackLink } from "@/components/content/back-link"
import { CoverImage } from "@/components/content/cover-image"
import { RichContent } from "@/components/content/rich-content"
import { PostMeta } from "@/components/posts/post-meta"
import { PostViewCount } from "@/components/posts/post-view-count"
import { TableOfContents } from "@/components/posts/table-of-contents"
import { SiteContainer } from "@/components/site/site-container"
import { postDetailPath, ROUTES } from "@/config/routes"
import { siteConfig } from "@/config/site"
import { getPublishedPost } from "@/lib/data/public-posts"
import { getPublishedPostSlugs } from "@/lib/data/published-slugs"
import { absoluteUrl, createPageMetadata, serializeJsonLd } from "@/lib/seo"
import { TOC_VARIANT } from "@/lib/content/toc"
import { toSlugParams } from "@/lib/static-params"
import { cn } from "@/lib/utils"

// 標題少於兩個時目錄沒有導覽價值，不顯示
const MIN_TOC_ITEMS = 2

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

  const hasToc = post.toc.length >= MIN_TOC_ITEMS

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

  const maybeRenderInlineToc = () => {
    if (!hasToc) return null
    return <TableOfContents items={post.toc} variant={TOC_VARIANT.INLINE} />
  }

  const maybeRenderSidebarToc = () => {
    if (!hasToc) return null

    return (
      <aside className="hidden lg:block">
        <TableOfContents items={post.toc} variant={TOC_VARIANT.SIDEBAR} />
      </aside>
    )
  }

  return (
    <SiteContainer
      className={cn(
        "py-10 sm:py-14",
        hasToc ? "grid gap-12 lg:grid-cols-[minmax(0,1fr)_14rem]" : "max-w-3xl",
      )}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <article className="flex max-w-3xl min-w-0 flex-col gap-8">
        <header className="flex flex-col gap-5">
          <BackLink href={ROUTES.POSTS} label="所有文章" />
          <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl sm:leading-tight">
            {post.title}
          </h1>
          <PostMeta
            post={post}
            extra={<PostViewCount slug={slug} initialCount={post.viewCount} />}
            className="text-sm"
          />
          {maybeRenderExcerpt()}
        </header>
        {maybeRenderCover()}
        {maybeRenderInlineToc()}
        <RichContent html={post.html} className="border-t border-border/60 pt-8" />
      </article>
      {maybeRenderSidebarToc()}
    </SiteContainer>
  )
}
