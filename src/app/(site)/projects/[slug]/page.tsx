import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ExternalLinkIcon } from "lucide-react"

import { BackLink } from "@/components/content/back-link"
import { CoverImage } from "@/components/content/cover-image"
import { RichContent } from "@/components/content/rich-content"
import { ExternalLink } from "@/components/site/external-link"
import { SiteContainer } from "@/components/site/site-container"
import { SocialIcon } from "@/components/site/social-icon"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { projectDetailPath, ROUTES } from "@/config/routes"
import { SOCIAL_PLATFORM } from "@/config/site"
import { formatCategoryPath } from "@/lib/content/category-filter"
import { getPublishedProject } from "@/lib/data/public-projects"
import { getPublishedProjectSlugs } from "@/lib/data/published-slugs"
import { createPageMetadata } from "@/lib/seo"
import { toSlugParams } from "@/lib/static-params"

// Next.js 16 Partial Prefetching：專案內頁屬於完整內容直出型路由，允許 blocking 導航避免未包覆 Suspense 之警告
export const instant = false

export async function generateStaticParams() {
  return toSlugParams(await getPublishedProjectSlugs())
}

export async function generateMetadata({
  params,
}: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params
  const project = await getPublishedProject(slug)

  if (!project) return { title: "找不到作品" }

  return createPageMetadata({
    path: projectDetailPath(slug),
    title: project.title,
    description: project.summary,
    image: project.coverImageUrl,
  })
}

export default async function ProjectPage({ params }: PageProps<"/projects/[slug]">) {
  const { slug } = await params
  const project = await getPublishedProject(slug)

  if (!project) notFound()

  const { title, summary, coverImageUrl, demoUrl, repoUrl, techStack, html } = project
  const categoryPath = formatCategoryPath(project)

  const maybeRenderCategory = () => {
    if (!categoryPath) return null
    return <p className="text-sm font-medium text-muted-foreground">{categoryPath}</p>
  }

  const maybeRenderDemoLink = () => {
    if (!demoUrl) return null

    return (
      <ExternalLink href={demoUrl} className={buttonVariants({ size: "lg" })}>
        <ExternalLinkIcon data-icon="inline-start" aria-hidden />
        Live Demo
      </ExternalLink>
    )
  }

  const maybeRenderRepoLink = () => {
    if (!repoUrl) return null

    return (
      <ExternalLink href={repoUrl} className={buttonVariants({ size: "lg", variant: "outline" })}>
        <SocialIcon platform={SOCIAL_PLATFORM.GITHUB} data-icon="inline-start" />
        GitHub 原始碼
      </ExternalLink>
    )
  }

  const maybeRenderCover = () => {
    if (!coverImageUrl) return null
    return <CoverImage src={coverImageUrl} alt={title} />
  }

  return (
    <SiteContainer className="max-w-3xl py-10 sm:py-14">
      <article className="flex flex-col gap-8">
        <header className="flex flex-col gap-5">
          <BackLink href={ROUTES.PROJECTS} label="所有作品" />
          {maybeRenderCategory()}
          <h1 className="-mt-2 text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl sm:leading-tight">
            {title}
          </h1>
          <p className="text-lg leading-relaxed text-pretty text-muted-foreground">{summary}</p>
          <ul aria-label="技術棧" className="flex flex-wrap gap-2">
            {techStack.map((tech) => (
              <li key={tech}>
                <Badge variant="tag" className="h-7 px-3 font-mono font-normal">
                  {tech}
                </Badge>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            {maybeRenderDemoLink()}
            {maybeRenderRepoLink()}
          </div>
        </header>
        {maybeRenderCover()}
        <RichContent html={html} className="border-t border-border/60 pt-8" />
      </article>
    </SiteContainer>
  )
}
