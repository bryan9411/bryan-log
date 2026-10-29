import Image from "next/image"
import Link from "next/link"
import { connection } from "next/server"

import { Skeleton } from "@/components/ui/skeleton"
import { sectionPath } from "@/config/routes"
import { getSectionTone } from "@/lib/content/section-tone"
import { getPublishedPosts } from "@/lib/data/public-posts"
import type { Section } from "@/lib/data/sections"
import { cn } from "@/lib/utils"

const SECTION_GRID_CLASS = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"

const COVER_CLASS = "relative aspect-video overflow-hidden border-b"

// 未上傳封面時的預設圖：區塊配色漸層加上淡格線與區塊名稱，每個區塊顏色不同，並排時仍可區分
function DefaultSectionCover({ name, tone }: { name: string; tone: string }) {
  return (
    <div aria-hidden className={cn(COVER_CLASS, "bg-muted/40")}>
      <div className={cn("absolute inset-0 bg-linear-to-br", tone)} />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] mask-[radial-gradient(ellipse_at_top_left,black,transparent_75%)] bg-size-[24px_24px] opacity-60" />
      <span
        className={cn(
          "absolute bottom-3 left-5 text-3xl font-semibold tracking-tight text-balance",
          tone,
        )}
      >
        {name}
      </span>
    </div>
  )
}

// 每個區塊一張導覽卡，顯示封面、文章數與最新一篇；後台新增區塊後自動出現
export async function SectionCards({ sections }: { sections: Section[] }) {
  await connection()
  const posts = await getPublishedPosts()

  const renderCover = (section: Section, index: number) => {
    if (!section.coverImageUrl) {
      return <DefaultSectionCover name={section.name} tone={getSectionTone(index).cover} />
    }

    return (
      <div className={cn(COVER_CLASS, "bg-muted")}>
        <Image
          src={section.coverImageUrl}
          alt=""
          fill
          sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </div>
    )
  }

  return (
    <ul className={SECTION_GRID_CLASS}>
      {sections.map((section, index) => {
        const sectionPosts = posts.filter((post) => post.section.slug === section.slug)
        const latestPost = sectionPosts[0]

        return (
          <li key={section.id}>
            <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-foreground/20">
              {renderCover(section, index)}
              <div className="flex flex-1 flex-col gap-2 p-5">
                <h3 className="text-base font-semibold tracking-tight">
                  {/* 以偽元素讓整張卡片可點擊，同時保持單一連結的語意 */}
                  <Link
                    href={sectionPath(section.slug)}
                    className="after:absolute after:inset-0 after:rounded-xl"
                  >
                    {section.name}
                  </Link>
                </h3>
                {section.description ? (
                  <p className="line-clamp-2 text-sm text-pretty text-muted-foreground">
                    {section.description}
                  </p>
                ) : null}
                <div className="mt-auto flex flex-col gap-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  <span>
                    {sectionPosts.length} 篇文章{latestPost ? " · 最新" : ""}
                  </span>
                  {latestPost ? (
                    <span className="line-clamp-1 text-sm font-medium text-foreground/85">
                      {latestPost.title}
                    </span>
                  ) : null}
                </div>
              </div>
            </article>
          </li>
        )
      })}
    </ul>
  )
}

export function SectionCardsSkeleton({ count }: { count: number }) {
  return (
    <ul aria-hidden className={SECTION_GRID_CLASS}>
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="flex flex-col overflow-hidden rounded-xl border">
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="flex flex-col gap-3 p-5">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-3 h-10 w-full" />
          </div>
        </li>
      ))}
    </ul>
  )
}
