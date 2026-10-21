import type { ContentStatus } from "../../src/lib/constants/content.ts"

export const BLOCK_TYPE = {
  HEADING_2: "h2",
  HEADING_3: "h3",
  PARAGRAPH: "p",
  CODE: "code",
  BULLET_LIST: "ul",
  QUOTE: "quote",
} as const

// 段落文字支援 `行內程式碼` 與 **粗體** 兩種行內標記
export type SeedBlock =
  | { type: typeof BLOCK_TYPE.HEADING_2 | typeof BLOCK_TYPE.HEADING_3; text: string }
  | { type: typeof BLOCK_TYPE.PARAGRAPH | typeof BLOCK_TYPE.QUOTE; text: string }
  | { type: typeof BLOCK_TYPE.CODE; language: string; code: string }
  | { type: typeof BLOCK_TYPE.BULLET_LIST; items: string[] }

export type SeedCategory = {
  slug: string
  name: string
  description: string
  children: Array<{ slug: string; name: string }>
}

export type SeedPost = {
  slug: string
  title: string
  excerpt: string
  categorySlug: string
  status: ContentStatus
  blocks: SeedBlock[]
}

export type SeedProject = {
  slug: string
  title: string
  summary: string
  categorySlug: string
  techStack: string[]
  isFeatured: boolean
  demoUrl: string | null
  repoUrl: string | null
  blocks: SeedBlock[]
}
