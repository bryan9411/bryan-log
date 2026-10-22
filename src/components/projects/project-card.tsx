import Image from "next/image"
import Link from "next/link"
import { ExternalLinkIcon } from "lucide-react"

import { ExternalLink } from "@/components/site/external-link"
import { GithubIcon } from "@/components/site/github-icon"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { projectDetailPath } from "@/config/routes"
import type { ProjectSummary } from "@/lib/data/public-projects"
import { cn } from "@/lib/utils"

const PROJECT_LINK_CLASS = cn(buttonVariants({ variant: "outline", size: "sm" }), "relative z-10")

type ProjectCardProps = {
  project: ProjectSummary
}

export function ProjectCard({ project }: ProjectCardProps) {
  const { title, slug, summary, coverImageUrl, demoUrl, repoUrl, techStack } = project

  const maybeRenderCover = () => {
    if (!coverImageUrl) return null

    return (
      <div className="relative aspect-video overflow-hidden border-b bg-muted">
        <Image
          src={coverImageUrl}
          alt=""
          fill
          sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </div>
    )
  }

  const maybeRenderDemoLink = () => {
    if (!demoUrl) return null

    return (
      <ExternalLink href={demoUrl} className={PROJECT_LINK_CLASS}>
        <ExternalLinkIcon aria-hidden />
        Live Demo
      </ExternalLink>
    )
  }

  const maybeRenderRepoLink = () => {
    if (!repoUrl) return null

    return (
      <ExternalLink href={repoUrl} className={PROJECT_LINK_CLASS}>
        <GithubIcon />
        GitHub
      </ExternalLink>
    )
  }

  return (
    <article className="group relative flex w-full flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-shadow hover:shadow-md hover:ring-foreground/20">
      {maybeRenderCover()}
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-col gap-2">
          <h3 className="text-base leading-snug font-semibold tracking-tight text-pretty">
            <Link href={projectDetailPath(slug)} className="after:absolute after:inset-0">
              {title}
            </Link>
          </h3>
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{summary}</p>
        </div>
        <ul aria-label="技術棧" className="mt-auto flex flex-wrap gap-1.5">
          {techStack.map((tech) => (
            <li key={tech}>
              <Badge variant="tag" className="font-mono font-normal">
                {tech}
              </Badge>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          {maybeRenderDemoLink()}
          {maybeRenderRepoLink()}
        </div>
      </div>
    </article>
  )
}
