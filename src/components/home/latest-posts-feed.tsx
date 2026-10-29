import { connection } from "next/server"
import { FileTextIcon } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { PostListItem } from "@/components/posts/post-list-item"
import { PostListSkeleton } from "@/components/posts/post-list-skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HOME_LATEST_POSTS_LIMIT } from "@/config/home"
import { getSectionTone } from "@/lib/content/section-tone"
import { getPublishedPosts, type PostSummary } from "@/lib/data/public-posts"
import type { Section } from "@/lib/data/sections"

// 區塊代稱只允許小寫英數與連字號，底線開頭的值不會和任何區塊撞名
const ALL_TAB_VALUE = "__all"

type FeedTab = {
  value: string
  label: string
  count: number
  posts: PostSummary[]
}

function buildFeedTabs(sections: Section[], posts: PostSummary[]): FeedTab[] {
  const sectionTabs = sections.map((section) => {
    const sectionPosts = posts.filter((post) => post.section.slug === section.slug)
    return {
      value: section.slug,
      label: section.name,
      count: sectionPosts.length,
      posts: sectionPosts.slice(0, HOME_LATEST_POSTS_LIMIT),
    }
  })

  return [
    {
      value: ALL_TAB_VALUE,
      label: "全部",
      count: posts.length,
      posts: posts.slice(0, HOME_LATEST_POSTS_LIMIT),
    },
    ...sectionTabs,
  ]
}

// 多個區塊時首頁只保留一段最新文章，以分頁籤切換區塊，避免首頁隨區塊增加而無限拉長
// 所有分頁的文章都在伺服器端備妥，切換時不需要再次請求；查詢與搜尋索引、歸檔頁共用同一份快取
export async function LatestPostsFeed({ sections }: { sections: Section[] }) {
  await connection()
  const posts = await getPublishedPosts()

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={FileTextIcon}
        title="尚無文章"
        description="第一篇文章正在撰寫中，敬請期待。"
      />
    )
  }

  const toneBySlug = new Map(
    sections.map((section, index) => [section.slug, getSectionTone(index).badge]),
  )
  const tabs = buildFeedTabs(sections, posts)

  const renderPanel = ({ value, label, posts: tabPosts }: FeedTab) => {
    if (tabPosts.length === 0) {
      return (
        <EmptyState
          icon={FileTextIcon}
          title="尚無文章"
          description={`第一篇${label}正在撰寫中，敬請期待。`}
        />
      )
    }

    return (
      <ul className="-mx-4 flex flex-col divide-y divide-border/60 sm:-mx-5">
        {tabPosts.map((post) => (
          <li key={post.slug}>
            {/* 單一區塊的分頁不需要再標示區塊 */}
            <PostListItem
              post={post}
              sectionTone={value === ALL_TAB_VALUE ? toneBySlug.get(post.section.slug) : undefined}
            />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <Tabs defaultValue={ALL_TAB_VALUE} className="flex flex-col gap-4">
      <TabsList aria-label="依區塊篩選" className="max-w-full justify-start overflow-x-auto">
        {tabs.map(({ value, label, count }) => (
          <TabsTrigger key={value} value={value}>
            {label}
            <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          {renderPanel(tab)}
        </TabsContent>
      ))}
    </Tabs>
  )
}

export function LatestPostsFeedSkeleton() {
  return <PostListSkeleton count={HOME_LATEST_POSTS_LIMIT} />
}
