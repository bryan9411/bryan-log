import "server-only"

import { postDetailPath, projectDetailPath, ROUTES } from "@/config/routes"
import { siteConfig } from "@/config/site"
import { formatCategoryPath } from "@/lib/content/category-filter"
import { tiptapJsonToMarkdown } from "@/lib/content/markdown"
import type { LlmsPost, PostSummary } from "@/lib/data/public-posts"
import type { ProjectSummary } from "@/lib/data/public-projects"
import { formatDate } from "@/lib/format"
import { absoluteUrl } from "@/lib/seo"

const UNCATEGORIZED_LABEL = "其他"
const SECTION_SEPARATOR = "\n\n"

// 連結文字中的方括號會提前結束 Markdown 連結，需轉義
const escapeLinkText = (text: string) => text.replace(/([[\]])/g, "\\$1")
// 單行描述：去除換行，避免破壞清單格式
const toSingleLine = (text: string) => text.replace(/\s+/g, " ").trim()

const linkItem = (title: string, url: string, description?: string | null) =>
  `- [${escapeLinkText(title)}](${url})${description ? `: ${toSingleLine(description)}` : ""}`

function buildIntro() {
  return [
    `# ${siteConfig.name}`,
    `> ${siteConfig.description}`,
    [
      `作者：${siteConfig.author}（GitHub：${siteConfig.githubUrl}）。`,
      "內容以繁體中文撰寫，主題涵蓋前端工程、全端架構與資訊安全。",
      "引用本站內容時，請附上原文網址並標註作者。",
    ].join(""),
  ].join(SECTION_SEPARATOR)
}

// 依主分類分組（無父分類時分類本身即為主分類），保留文章原本由新到舊的順序
function groupPostsByCategory(posts: PostSummary[]) {
  const groups = new Map<string, PostSummary[]>()

  posts.forEach((post) => {
    const key = post.parentCategory?.name ?? post.category?.name ?? UNCATEGORIZED_LABEL
    groups.set(key, [...(groups.get(key) ?? []), post])
  })

  // 「其他」固定排在最後
  return [...groups.entries()].sort(
    ([a], [b]) => Number(a === UNCATEGORIZED_LABEL) - Number(b === UNCATEGORIZED_LABEL),
  )
}

// /llms.txt：依 llmstxt.org 格式輸出網站摘要與所有公開內容的索引
export function buildLlmsTxt(posts: PostSummary[], projects: ProjectSummary[]) {
  const postSections = groupPostsByCategory(posts).map(([category, items]) =>
    [
      `## 技術文章：${category}`,
      items
        .map((post) => linkItem(post.title, absoluteUrl(postDetailPath(post.slug)), post.excerpt))
        .join("\n"),
    ].join(SECTION_SEPARATOR),
  )

  const projectSection =
    projects.length > 0
      ? [
          "## 作品集",
          projects
            .map((project) =>
              linkItem(
                project.title,
                absoluteUrl(projectDetailPath(project.slug)),
                project.techStack.length > 0
                  ? `${project.summary}（技術：${project.techStack.join("、")}）`
                  : project.summary,
              ),
            )
            .join("\n"),
        ].join(SECTION_SEPARATOR)
      : null

  // llmstxt.org 約定：「Optional」區段為可略過的補充資源
  const optionalSection = [
    "## Optional",
    [
      linkItem(
        "所有文章全文（Markdown）",
        absoluteUrl(ROUTES.LLMS_FULL_TXT),
        "所有已發布文章的完整內容，適合一次性讀取",
      ),
      linkItem("Sitemap", absoluteUrl("/sitemap.xml")),
    ].join("\n"),
  ].join(SECTION_SEPARATOR)

  return `${[buildIntro(), ...postSections, projectSection, optionalSection]
    .filter(Boolean)
    .join(SECTION_SEPARATOR)}\n`
}

function buildPostSection(post: LlmsPost) {
  const meta = [
    `- 網址：${absoluteUrl(postDetailPath(post.slug))}`,
    `- 分類：${formatCategoryPath(post) ?? UNCATEGORIZED_LABEL}`,
    post.publishedAt ? `- 發布日期：${formatDate(post.publishedAt)}` : null,
    `- 最後更新：${formatDate(post.updatedAt)}`,
    `- 閱讀時間：約 ${post.readingMinutes} 分鐘`,
  ].filter(Boolean)

  const tldr =
    post.tldr.length > 0
      ? ["## TL;DR", post.tldr.map((point) => `- ${toSingleLine(point)}`).join("\n")].join(
          SECTION_SEPARATOR,
        )
      : null

  const excerpt = post.excerpt ? `> ${toSingleLine(post.excerpt)}` : null

  return [
    `# ${post.title}`,
    meta.join("\n"),
    excerpt,
    tldr,
    tiptapJsonToMarkdown(post.contentJson).trim(),
  ]
    .filter(Boolean)
    .join(SECTION_SEPARATOR)
}

// /llms-full.txt：所有已發布文章的 Markdown 全文，文章之間以分隔線區隔
export function buildLlmsFullTxt(posts: LlmsPost[]) {
  const header = [
    `# ${siteConfig.name}：文章全文`,
    `> ${siteConfig.description}`,
    `共 ${posts.length} 篇已發布文章，依發布時間由新到舊排列。文章索引請見 ${absoluteUrl(ROUTES.LLMS_TXT)}。`,
  ].join(SECTION_SEPARATOR)

  return `${[header, ...posts.map(buildPostSection)].join("\n\n---\n\n")}\n`
}
