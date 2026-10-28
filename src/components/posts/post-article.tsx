import type { ReactNode } from "react"

import { BackLink } from "@/components/content/back-link"
import { CodeBlockInteractions } from "@/components/content/code-block-interactions"
import { ImageLightbox } from "@/components/content/image-lightbox"
import { CoverImage } from "@/components/content/cover-image"
import { RichContent } from "@/components/content/rich-content"
import { PostMeta } from "@/components/posts/post-meta"
import { TableOfContents } from "@/components/posts/table-of-contents"
import { TldrCard } from "@/components/posts/tldr-card"
import { SiteContainer } from "@/components/site/site-container"
import { sectionPath } from "@/config/routes"
import { TOC_VARIANT } from "@/lib/content/toc"
import type { PostDetail } from "@/lib/data/public-posts"
import { cn } from "@/lib/utils"

// 標題少於兩個時目錄沒有導覽價值，不顯示
const MIN_TOC_ITEMS = 2

type PostArticleProps = {
  post: PostDetail
  // 接在閱讀時間之後的額外資訊，例如前台的瀏覽數
  metaExtra?: ReactNode
  // 接在內文之後的延伸區塊，例如上一篇／下一篇與相關文章
  footer?: ReactNode
}

// 文章內頁與草稿預覽共用同一份排版，確保預覽看到的就是訪客實際看到的樣子
export function PostArticle({ post, metaExtra, footer }: PostArticleProps) {
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

  const maybeRenderDrawerToc = () => {
    if (!hasToc) return null
    return <TableOfContents items={post.toc} variant={TOC_VARIANT.DRAWER} />
  }

  const maybeRenderFooter = () => {
    if (!footer) return null
    return <footer className="flex flex-col gap-10 border-t border-border/60 pt-8">{footer}</footer>
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
      <article className="flex max-w-3xl min-w-0 flex-col gap-8">
        <header className="flex flex-col gap-5">
          <BackLink href={sectionPath(post.section.slug)} label={`所有${post.section.name}`} />
          <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl sm:leading-tight">
            {post.title}
          </h1>
          <PostMeta post={post} extra={metaExtra} className="text-sm" />
          {maybeRenderExcerpt()}
        </header>
        <TldrCard points={post.tldr} />
        {maybeRenderCover()}
        {maybeRenderDrawerToc()}
        <RichContent html={post.html} className="border-t border-border/60 pt-8" />
        <CodeBlockInteractions />
        <ImageLightbox />
        {maybeRenderFooter()}
      </article>
      {maybeRenderSidebarToc()}
    </SiteContainer>
  )
}
