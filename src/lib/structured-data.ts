import "server-only"

import { categoryFilterRoute, postDetailPath, ROUTES } from "@/config/routes"
import { siteConfig } from "@/config/site"
import { decodeHtmlEntities } from "@/lib/content/html-entities"
import type { PostDetail } from "@/lib/data/public-posts"
import { absoluteUrl } from "@/lib/seo"

// Google 建議 headline 不超過 110 字元
const HEADLINE_MAX_LENGTH = 110

const SCHEMA_CONTEXT = "https://schema.org"

const TAG_PATTERN = /<[^>]+>/g
const CJK_CHAR_PATTERN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu
const LATIN_WORD_PATTERN = /[A-Za-z0-9]+(?:['’.-][A-Za-z0-9]+)*/g

// 中英混排的字數：中日韓文字每字計一，英數以單字計一
function countWords(html: string) {
  const text = decodeHtmlEntities(html.replace(TAG_PATTERN, " "))
  const cjkCount = text.match(CJK_CHAR_PATTERN)?.length ?? 0
  const latinCount = text.replace(CJK_CHAR_PATTERN, " ").match(LATIN_WORD_PATTERN)?.length ?? 0
  return cjkCount + latinCount
}

const truncate = (text: string, maxLength: number) =>
  text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text

// 作者與網站以 @id 互相參照，同一頁的多個節點不必重複描述同一個實體
const AUTHOR_ID = `${absoluteUrl(ROUTES.HOME)}#author`
const BLOG_ID = `${absoluteUrl(ROUTES.POSTS)}#blog`

function buildAuthor() {
  return {
    "@type": "Person",
    "@id": AUTHOR_ID,
    name: siteConfig.author,
    url: absoluteUrl(ROUTES.HOME),
    sameAs: [siteConfig.githubUrl],
  }
}

function buildBreadcrumb(post: PostDetail, url: string) {
  const category = post.parentCategory ?? post.category
  const crumbs = [
    { name: siteConfig.name, item: absoluteUrl(ROUTES.HOME) },
    { name: "技術文章", item: absoluteUrl(ROUTES.POSTS) },
    ...(category
      ? [
          {
            name: category.name,
            item: absoluteUrl(categoryFilterRoute(ROUTES.POSTS, category.slug)),
          },
        ]
      : []),
    { name: post.title, item: url },
  ]

  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.item,
    })),
  }
}

// TechArticle：技術文章專用的 Article 子類型，標明主題分類、閱讀時間與速讀摘要（abstract），
// 並以 speakable 指向 TL;DR 卡片，讓 AI 搜尋與語音助理優先引用；同時輸出麵包屑
export function buildPostStructuredData(post: PostDetail, speakableSelector: string) {
  const url = absoluteUrl(postDetailPath(post.slug))
  const keywords = [post.parentCategory?.name, post.category?.name].filter((name): name is string =>
    Boolean(name),
  )
  const hasTldr = post.tldr.length > 0

  const article = {
    "@type": "TechArticle",
    "@id": `${url}#article`,
    headline: truncate(post.title, HEADLINE_MAX_LENGTH),
    description: post.excerpt ?? undefined,
    abstract: hasTldr ? post.tldr.join("；") : (post.excerpt ?? undefined),
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    image: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    datePublished: post.publishedAt ?? undefined,
    dateModified: post.updatedAt,
    inLanguage: siteConfig.locale,
    author: buildAuthor(),
    publisher: { "@id": AUTHOR_ID },
    isPartOf: {
      "@type": "Blog",
      "@id": BLOG_ID,
      name: siteConfig.name,
      url: absoluteUrl(ROUTES.POSTS),
    },
    articleSection: keywords[0],
    keywords: keywords.length > 0 ? keywords : undefined,
    wordCount: countWords(post.html),
    timeRequired: `PT${post.readingMinutes}M`,
    speakable: hasTldr
      ? { "@type": "SpeakableSpecification", cssSelector: [speakableSelector] }
      : undefined,
  }

  return {
    "@context": SCHEMA_CONTEXT,
    "@graph": [article, buildBreadcrumb(post, url)],
  }
}
