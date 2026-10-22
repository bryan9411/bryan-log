import "server-only"

import { strToU8, zipSync, type Zippable } from "fflate"

import { siteConfig } from "@/config/site"
import { collectImageUrls, tiptapJsonToMarkdown } from "@/lib/content/markdown"
import type { ExportablePost } from "@/lib/data/posts"

const POSTS_DIR = "posts"
const ZIP_COMPRESSION_LEVEL = 6

type FrontmatterValue = string | number | null | string[]

// YAML 的雙引號字串與 JSON 字串語法相容，以 JSON.stringify 轉義即可安全處理引號、換行與冒號
function toYamlValue(value: FrontmatterValue) {
  if (Array.isArray(value)) {
    return value.length === 0
      ? "[]"
      : `\n${value.map((item) => `  - ${JSON.stringify(item)}`).join("\n")}`
  }
  if (value === null) return "null"
  if (typeof value === "number") return String(value)
  return JSON.stringify(value)
}

function buildFrontmatter(fields: Record<string, FrontmatterValue>) {
  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${toYamlValue(value)}`)
  return `---\n${lines.join("\n")}\n---\n`
}

// 以 JSON 文件為準轉為 Markdown；若 JSON 無內容但仍有 HTML（例如舊資料），直接附上 HTML，Markdown 可原樣保留
function toMarkdownBody(post: ExportablePost) {
  const markdown = tiptapJsonToMarkdown(post.contentJson)
  if (markdown.trim() || !post.contentHtml.trim()) return markdown
  return `${post.contentHtml.trim()}\n`
}

function toPostFile(post: ExportablePost) {
  const images = collectImageUrls(post.contentJson)

  const frontmatter = buildFrontmatter({
    title: post.title,
    slug: post.slug,
    status: post.status,
    excerpt: post.excerpt,
    tldr: post.tldr,
    category: post.categoryPath,
    coverImage: post.coverImageUrl,
    images,
    readingTimeMinutes: post.readingMinutes,
    viewCount: post.viewCount,
    publishedAt: post.publishedAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  })

  return {
    path: `${POSTS_DIR}/${post.slug}.md`,
    content: `${frontmatter}\n${toMarkdownBody(post)}`,
    images,
  }
}

function buildReadme(postCount: number, exportedAt: string) {
  return [
    `# ${siteConfig.name} 文章備份`,
    "",
    `- 匯出時間：${exportedAt}`,
    `- 文章數量：${postCount}（含草稿）`,
    "",
    "## 檔案結構",
    "",
    `- \`${POSTS_DIR}/<slug>.md\`：每篇文章一個檔案，開頭為 YAML Frontmatter（標題、狀態、分類、封面與內文圖片網址、時間戳記），其後為 Markdown 內文。`,
    "- `index.json`：所有文章的索引，方便以程式批次匯入其他平台。",
    "",
    "圖片仍存放於原本的 Supabase Storage，網址列於各篇的 `coverImage` 與 `images` 欄位，搬家時可依此下載。",
    "",
  ].join("\n")
}

// 打包成 ZIP：每篇文章的修改時間設為資料庫的 updated_at，解壓後可直接看出最後編輯時間
export function buildPostsArchive(posts: ExportablePost[], exportedAt: Date) {
  const files: Zippable = {}
  const index = posts.map((post) => {
    const file = toPostFile(post)
    files[file.path] = [strToU8(file.content), { mtime: new Date(post.updatedAt) }]

    return {
      title: post.title,
      slug: post.slug,
      status: post.status,
      file: file.path,
      coverImage: post.coverImageUrl,
      images: file.images,
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt,
    }
  })

  files["index.json"] = strToU8(`${JSON.stringify(index, null, 2)}\n`)
  files["README.md"] = strToU8(buildReadme(posts.length, exportedAt.toISOString()))

  return zipSync(files, { level: ZIP_COMPRESSION_LEVEL, mtime: exportedAt })
}

const filenameStampFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Taipei",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})

// 例如 bryan-log-posts-20261022-1530.zip（台北時間）
export function buildArchiveFilename(exportedAt: Date) {
  const parts = Object.fromEntries(
    filenameStampFormatter.formatToParts(exportedAt).map(({ type, value }) => [type, value]),
  )
  return `bryan-log-posts-${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}.zip`
}
