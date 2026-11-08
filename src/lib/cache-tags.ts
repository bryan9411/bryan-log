// 前台公開資料的快取標籤：後台異動時以 updateTag 精準失效，首頁、列表與 sitemap 會同步更新
export const CACHE_TAG = {
  POSTS: "public-posts",
  PROJECTS: "public-projects",
  CATEGORIES: "public-categories",
  SECTIONS: "public-sections",
} as const

// 排程文章到時間時沒有後台操作可觸發失效，只能靠快取到期；前台最晚約 5 分鐘內出現
export const POSTS_CACHE_LIFE = { stale: 300, revalidate: 300, expire: 86_400 } as const

export type CacheTag = (typeof CACHE_TAG)[keyof typeof CACHE_TAG]
