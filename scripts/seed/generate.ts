// 產生 supabase/seed.sql：由單一內容來源同時輸出 Tiptap JSON 與 HTML，確保雙存內容一致
// 執行：pnpm db:seed:generate

import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { CATEGORY_TYPE, CONTENT_STATUS } from "../../src/lib/constants/content.ts"
import { estimateReadingMinutes } from "../../src/lib/content/reading-time.ts"
import type { CategoryType } from "../../src/lib/constants/content.ts"
import { postCategories, posts, projectCategories, projects } from "./data.ts"
import { BLOCK_TYPE } from "./types.ts"
import type { SeedBlock, SeedCategory } from "./types.ts"

const OUTPUT_PATH = fileURLToPath(new URL("../../supabase/seed.sql", import.meta.url))

const FIRST_PUBLISHED_AT = Date.UTC(2026, 0, 8, 1, 0, 0)
const PUBLISH_INTERVAL_DAYS = 14
const DAY_IN_MS = 24 * 60 * 60 * 1000

const TIPTAP_NODE = {
  DOC: "doc",
  HEADING: "heading",
  PARAGRAPH: "paragraph",
  CODE_BLOCK: "codeBlock",
  BULLET_LIST: "bulletList",
  LIST_ITEM: "listItem",
  BLOCKQUOTE: "blockquote",
  TEXT: "text",
} as const

const TIPTAP_MARK = {
  BOLD: "bold",
  CODE: "code",
} as const

type TiptapMark = { type: (typeof TIPTAP_MARK)[keyof typeof TIPTAP_MARK] }

type TiptapNode = {
  type: (typeof TIPTAP_NODE)[keyof typeof TIPTAP_NODE]
  attrs?: Record<string, string | number>
  content?: TiptapNode[]
  marks?: TiptapMark[]
  text?: string
}

type InlineSegment = { text: string; mark: TiptapMark["type"] | null }

const INLINE_PATTERN = /(`[^`]+`|\*\*[^*]+\*\*)/g

function parseInline(text: string): InlineSegment[] {
  return text
    .split(INLINE_PATTERN)
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith("`")) return { text: part.slice(1, -1), mark: TIPTAP_MARK.CODE }
      if (part.startsWith("**")) return { text: part.slice(2, -2), mark: TIPTAP_MARK.BOLD }
      return { text: part, mark: null }
    })
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

// ---------- Tiptap JSON ----------

function inlineToJson(text: string): TiptapNode[] {
  return parseInline(text).map(({ text: value, mark }) => ({
    type: TIPTAP_NODE.TEXT,
    text: value,
    ...(mark ? { marks: [{ type: mark }] } : {}),
  }))
}

function paragraphJson(text: string): TiptapNode {
  return { type: TIPTAP_NODE.PARAGRAPH, content: inlineToJson(text) }
}

function blockToJson(block: SeedBlock): TiptapNode {
  switch (block.type) {
    case BLOCK_TYPE.HEADING_2:
    case BLOCK_TYPE.HEADING_3:
      return {
        type: TIPTAP_NODE.HEADING,
        attrs: { level: block.type === BLOCK_TYPE.HEADING_2 ? 2 : 3 },
        content: inlineToJson(block.text),
      }
    case BLOCK_TYPE.PARAGRAPH:
      return paragraphJson(block.text)
    case BLOCK_TYPE.QUOTE:
      return { type: TIPTAP_NODE.BLOCKQUOTE, content: [paragraphJson(block.text)] }
    case BLOCK_TYPE.CODE:
      return {
        type: TIPTAP_NODE.CODE_BLOCK,
        attrs: { language: block.language },
        content: [{ type: TIPTAP_NODE.TEXT, text: block.code }],
      }
    case BLOCK_TYPE.BULLET_LIST:
      return {
        type: TIPTAP_NODE.BULLET_LIST,
        content: block.items.map((item) => ({
          type: TIPTAP_NODE.LIST_ITEM,
          content: [paragraphJson(item)],
        })),
      }
  }
}

function blocksToJson(blocks: SeedBlock[]): TiptapNode {
  return { type: TIPTAP_NODE.DOC, content: blocks.map(blockToJson) }
}

// ---------- HTML ----------

function inlineToHtml(text: string) {
  return parseInline(text)
    .map(({ text: value, mark }) => {
      const escaped = escapeHtml(value)
      if (mark === TIPTAP_MARK.CODE) return `<code>${escaped}</code>`
      if (mark === TIPTAP_MARK.BOLD) return `<strong>${escaped}</strong>`
      return escaped
    })
    .join("")
}

function blockToHtml(block: SeedBlock) {
  switch (block.type) {
    case BLOCK_TYPE.HEADING_2:
    case BLOCK_TYPE.HEADING_3:
      return `<${block.type}>${inlineToHtml(block.text)}</${block.type}>`
    case BLOCK_TYPE.PARAGRAPH:
      return `<p>${inlineToHtml(block.text)}</p>`
    case BLOCK_TYPE.QUOTE:
      return `<blockquote><p>${inlineToHtml(block.text)}</p></blockquote>`
    case BLOCK_TYPE.CODE:
      return `<pre><code class="language-${block.language}">${escapeHtml(block.code)}</code></pre>`
    case BLOCK_TYPE.BULLET_LIST:
      return `<ul>${block.items.map((item) => `<li><p>${inlineToHtml(item)}</p></li>`).join("")}</ul>`
  }
}

function blocksToHtml(blocks: SeedBlock[]) {
  return blocks.map(blockToHtml).join("")
}

// ---------- 衍生欄位 ----------

function blockTextLength(block: SeedBlock) {
  if (block.type === BLOCK_TYPE.CODE) return block.code.length
  if (block.type === BLOCK_TYPE.BULLET_LIST) return block.items.join("").length
  return block.text.length
}

function blocksReadingMinutes(blocks: SeedBlock[]) {
  const totalLength = blocks.reduce((sum, block) => sum + blockTextLength(block), 0)
  return estimateReadingMinutes(totalLength)
}

function buildPublishedAt(index: number) {
  return new Date(FIRST_PUBLISHED_AT + index * PUBLISH_INTERVAL_DAYS * DAY_IN_MS).toISOString()
}

// 以質數取餘數產生穩定但看似隨機的瀏覽數，確保每次產生結果相同
function buildViewCount(index: number) {
  return (((index + 1) * 7919) % 4800) + 120
}

// ---------- SQL ----------

function sqlString(value: string | null) {
  return value === null ? "null" : `'${value.replaceAll("'", "''")}'`
}

function sqlTextArray(values: string[]) {
  return `array[${values.map(sqlString).join(", ")}]::text[]`
}

function categoryIdSql(type: CategoryType, slug: string) {
  return `(select id from public.categories where type = '${type}' and slug = ${sqlString(slug)})`
}

function categoriesSql(type: CategoryType, categories: SeedCategory[]) {
  const parentRows = categories.map(
    (category, index) =>
      `  ('${type}', null, ${sqlString(category.name)}, ${sqlString(category.slug)}, ${sqlString(category.description)}, ${index})`,
  )

  const childRows = categories.flatMap((category) =>
    category.children.map(
      (child, index) =>
        `  ('${type}', ${categoryIdSql(type, category.slug)}, ${sqlString(child.name)}, ${sqlString(child.slug)}, null, ${index})`,
    ),
  )

  const insertInto =
    "insert into public.categories (type, parent_id, name, slug, description, sort_order) values"

  return [
    `-- ${type} 父分類`,
    insertInto,
    parentRows.join(",\n"),
    "on conflict (type, slug) do nothing;",
    "",
    `-- ${type} 子分類`,
    insertInto,
    childRows.join(",\n"),
    "on conflict (type, slug) do nothing;",
  ].join("\n")
}

function postsSql() {
  let publishedIndex = 0

  const rows = posts.map((post, index) => {
    const isPublished = post.status === CONTENT_STATUS.PUBLISHED
    const publishedAt = isPublished ? buildPublishedAt(publishedIndex++) : null

    return [
      "  (",
      `    ${sqlString(post.title)},`,
      `    ${sqlString(post.slug)},`,
      `    ${sqlString(post.excerpt)},`,
      `    ${categoryIdSql(CATEGORY_TYPE.POST, post.categorySlug)},`,
      `    ${sqlString(JSON.stringify(blocksToJson(post.blocks)))}::jsonb,`,
      `    ${sqlString(blocksToHtml(post.blocks))},`,
      `    '${post.status}',`,
      `    ${blocksReadingMinutes(post.blocks)},`,
      `    ${isPublished ? buildViewCount(index) : 0},`,
      `    ${publishedAt ? `${sqlString(publishedAt)}::timestamptz` : "null"}`,
      "  )",
    ].join("\n")
  })

  return [
    "insert into public.posts (title, slug, excerpt, category_id, content_json, content_html, status, reading_time_minutes, view_count, published_at) values",
    rows.join(",\n"),
    "on conflict (slug) do nothing;",
  ].join("\n")
}

function projectsSql() {
  const rows = projects.map((project, index) =>
    [
      "  (",
      `    ${sqlString(project.title)},`,
      `    ${sqlString(project.slug)},`,
      `    ${sqlString(project.summary)},`,
      `    ${sqlString(blocksToHtml(project.blocks))},`,
      `    ${categoryIdSql(CATEGORY_TYPE.PROJECT, project.categorySlug)},`,
      `    ${sqlTextArray(project.techStack)},`,
      `    ${project.isFeatured},`,
      `    ${index},`,
      `    ${sqlString(project.demoUrl)},`,
      `    ${sqlString(project.repoUrl)},`,
      `    '${CONTENT_STATUS.PUBLISHED}',`,
      `    ${sqlString(buildPublishedAt(index))}::timestamptz`,
      "  )",
    ].join("\n"),
  )

  return [
    "insert into public.projects (title, slug, summary, description_html, category_id, tech_stack, is_featured, sort_order, demo_url, repo_url, status, published_at) values",
    rows.join(",\n"),
    "on conflict (slug) do nothing;",
  ].join("\n")
}

const sql = [
  "-- =============================================================================",
  "-- Bryan Log 種子資料（由 scripts/seed/generate.ts 自動產生，請勿手動修改）",
  "-- 重新產生：pnpm db:seed:generate",
  "-- 須先執行 supabase_schema.sql；可重複執行，已存在的資料會略過",
  "-- =============================================================================",
  "",
  "begin;",
  "",
  categoriesSql(CATEGORY_TYPE.POST, postCategories),
  "",
  categoriesSql(CATEGORY_TYPE.PROJECT, projectCategories),
  "",
  "-- 技術文章",
  postsSql(),
  "",
  "-- 作品集",
  projectsSql(),
  "",
  "commit;",
  "",
].join("\n")

writeFileSync(OUTPUT_PATH, sql)

console.log(`已產生 ${OUTPUT_PATH}：${posts.length} 篇文章、${projects.length} 個作品`)
