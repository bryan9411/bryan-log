// 搜尋索引只包含比對與顯示所需的欄位，體積小、可整包快取在瀏覽器
export type SearchEntry = {
  title: string
  slug: string
  categoryPath: string | null
  readingMinutes: number
}

export type SearchIndexResponse = {
  entries: SearchEntry[]
}
