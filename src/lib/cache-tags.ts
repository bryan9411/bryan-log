// 前台公開資料的快取標籤：後台異動時以 updateTag 精準失效，首頁、列表與 sitemap 會同步更新
export const CACHE_TAG = {
  POSTS: "public-posts",
  PROJECTS: "public-projects",
  CATEGORIES: "public-categories",
  SECTIONS: "public-sections",
} as const

export type CacheTag = (typeof CACHE_TAG)[keyof typeof CACHE_TAG]
