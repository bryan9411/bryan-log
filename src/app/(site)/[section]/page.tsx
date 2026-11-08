import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { PostBrowser } from "@/components/posts/post-browser"
import { PageHeader } from "@/components/site/page-header"
import { SiteContainer } from "@/components/site/site-container"
import { sectionPath } from "@/config/routes"
import { getSectionCategoryTree } from "@/lib/data/categories"
import { getPublishedPosts } from "@/lib/data/public-posts"
import { getSectionBySlug, getSections, type Section } from "@/lib/data/sections"
import { createPageMetadata } from "@/lib/seo"
import { PLACEHOLDER_SLUG } from "@/lib/static-params"

// 區塊列表頁的內容完全由網址決定，允許 blocking 導航；之後新增的區塊於第一次請求時渲染並保存
export const instant = false

// 建置時預渲染所有區塊；Cache Components 規定至少回傳一筆，沒有區塊時以不存在的代稱佔位（回應 404）
export async function generateStaticParams() {
  const sections = await getSections()
  if (sections.length === 0) return [{ section: PLACEHOLDER_SLUG }]
  return sections.map(({ slug }) => ({ section: slug }))
}

export async function generateMetadata({ params }: PageProps<"/[section]">): Promise<Metadata> {
  const section = await getSectionBySlug((await params).section)

  if (!section) return { title: "找不到頁面" }

  return createPageMetadata({
    path: sectionPath(section.slug),
    title: section.name,
    description: section.description,
  })
}

// 資料有 "use cache"，完整清單會預渲染進靜態外殼；網址上的分類篩選由瀏覽器端套用
async function PostsExplorer({ section }: { section: Section }) {
  const [posts, categories] = await Promise.all([
    getPublishedPosts({ sectionId: section.id }),
    getSectionCategoryTree(section.id),
  ])

  return <PostBrowser posts={posts} categories={categories} sectionName={section.name} />
}

export default async function SectionPage({ params }: PageProps<"/[section]">) {
  const section = await getSectionBySlug((await params).section)

  if (!section) notFound()

  return (
    <SiteContainer className="flex flex-col gap-10 py-12 sm:py-16">
      <PageHeader title={section.name} description={section.description} />
      <PostsExplorer section={section} />
    </SiteContainer>
  )
}
