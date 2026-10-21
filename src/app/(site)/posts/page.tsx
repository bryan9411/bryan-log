import { connection } from "next/server"
import { Suspense } from "react"

import { CategoryFilterSkeleton } from "@/components/content/category-filter-skeleton"
import { PostBrowser } from "@/components/posts/post-browser"
import { PostListSkeleton } from "@/components/posts/post-list-skeleton"
import { PageHeader } from "@/components/site/page-header"
import { SiteContainer } from "@/components/site/site-container"
import { ROUTES } from "@/config/routes"
import { CATEGORY_TYPE } from "@/lib/constants/content"
import { getCategoryTree } from "@/lib/data/categories"
import { getPublishedPosts } from "@/lib/data/public-posts"
import { createPageMetadata } from "@/lib/seo"

const TITLE = "技術文章"
const DESCRIPTION = "前端工程、全端架構與資安實踐的技術筆記，依分類篩選找到你需要的主題。"
const SKELETON_COUNT = 6

export const metadata = createPageMetadata({
  path: ROUTES.POSTS,
  title: TITLE,
  description: DESCRIPTION,
})

// 篩選條件來自網址查詢參數，需在請求時渲染；以 connection() 標記後，
// 客戶端元件的 useSearchParams 才能在伺服器端取得實際參數並直接輸出篩選後的清單
async function PostsExplorer() {
  await connection()

  const [posts, categories] = await Promise.all([
    getPublishedPosts(),
    getCategoryTree(CATEGORY_TYPE.POST),
  ])

  return <PostBrowser posts={posts} categories={categories} />
}

function PostsExplorerSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <CategoryFilterSkeleton />
      <PostListSkeleton count={SKELETON_COUNT} />
    </div>
  )
}

export default function PostsPage() {
  return (
    <SiteContainer className="flex flex-col gap-10 py-12 sm:py-16">
      <PageHeader title={TITLE} description={DESCRIPTION} />
      <Suspense fallback={<PostsExplorerSkeleton />}>
        <PostsExplorer />
      </Suspense>
    </SiteContainer>
  )
}
