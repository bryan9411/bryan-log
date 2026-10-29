import Link from "next/link"
import { connection } from "next/server"

import { Skeleton } from "@/components/ui/skeleton"
import { sectionPath } from "@/config/routes"
import { getSectionTone } from "@/lib/content/section-tone"
import { getPublishedPosts } from "@/lib/data/public-posts"
import type { Section } from "@/lib/data/sections"
import { cn } from "@/lib/utils"

const SECTION_GRID_CLASS = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"

// 每個區塊一張導覽卡，顯示文章數與最新一篇；後台新增區塊後自動出現
export async function SectionCards({ sections }: { sections: Section[] }) {
  await connection()
  const posts = await getPublishedPosts()

  return (
    <ul className={SECTION_GRID_CLASS}>
      {sections.map((section, index) => {
        const sectionPosts = posts.filter((post) => post.section.slug === section.slug)
        const latestPost = sectionPosts[0]
        const tone = getSectionTone(index)

        return (
          <li key={section.id}>
            <article className="group relative flex h-full flex-col gap-3 rounded-xl border bg-card p-5 transition-colors hover:border-foreground/20 hover:bg-muted/40">
              <span
                aria-hidden
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg border text-sm font-semibold",
                  tone,
                )}
              >
                {section.name.slice(0, 1)}
              </span>
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
        <li key={index} className="flex flex-col gap-3 rounded-xl border p-5">
          <Skeleton className="size-9 rounded-lg" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="mt-3 h-10 w-full" />
        </li>
      ))}
    </ul>
  )
}
