// 前台公開資料的快取標籤：後台異動時以 updateTag 精準失效，首頁、列表與 sitemap 會同步更新
export const CACHE_TAG = {
  POSTS: "public-posts",
  PROJECTS: "public-projects",
  CATEGORIES: "public-categories",
  SECTIONS: "public-sections",
} as const

// 內文修改只影響單篇內頁與全文輸出，不必牽動列表；這兩類標籤不開放在後台手動失效，要全部更新時使用 POSTS
export const postContentTag = (slug: string) => `public-post:${slug}`
export const POSTS_FULL_TEXT_TAG = "public-posts-full-text"

// 排程文章到時間時沒有後台操作可觸發失效，只能靠快取到期；前台最晚約 5 分鐘內出現
export const POSTS_CACHE_LIFE = { stale: 300, revalidate: 300, expire: 86_400 } as const

export type CacheTag = (typeof CACHE_TAG)[keyof typeof CACHE_TAG]
