// 搜尋索引只包含比對與顯示所需的欄位，體積小、可整包快取在瀏覽器
export type SearchEntry = {
  title: string
  slug: string
  sectionSlug: string
  sectionName: string
  categoryPath: string | null
  readingMinutes: number
}

export type SearchIndexResponse = {
  entries: SearchEntry[]
  // 文章數最多的分類名稱，作為搜尋面板的熱門標籤
  popularTags: string[]
}
