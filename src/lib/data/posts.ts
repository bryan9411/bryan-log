import "server-only"

import type { JSONContent } from "@tiptap/core"

import type { ContentStatus } from "@/lib/constants/content"
import { isAutoExcerpt } from "@/lib/content/render-post"
import { CATEGORY_WITH_PARENT_SELECT, type CategoryRelation } from "@/lib/data/categories"
import { POST_DETAIL_COLUMNS, toPostDetail, type PostDetail } from "@/lib/data/public-posts"
import { createClient } from "@/lib/supabase/server"
import {
  ADMIN_POSTS_PAGE_SIZE,
  POST_STATUS_FILTER,
  type AdminPostListParams,
} from "@/lib/validations/admin-post-list"

export type AdminPostListItem = {
  id: string
  title: string
  slug: string
  status: ContentStatus
  viewCount: number
  updatedAt: string
  coverImageUrl: string | null
  categoryName: string | null
  parentCategoryName: string | null
}

export type EditablePost = {
  id: string
  title: string
  slug: string
  excerpt: string
  categoryId: string | null
  coverImageUrl: string | null
  contentJson: JSONContent
  status: ContentStatus
  updatedAt: string
}

export type AdminPostListPage = {
  posts: AdminPostListItem[]
  total: number
  // 實際顯示的頁碼：網址頁碼超出範圍時會被校正為最後一頁
  page: number
  pageCount: number
}

const ADMIN_POST_LIST_COLUMNS = `id, title, slug, status, view_count, updated_at, cover_image_url, ${CATEGORY_WITH_PARENT_SELECT}`

// PostgREST 回應「請求範圍超出資料筆數」的錯誤代碼
const RANGE_NOT_SATISFIABLE = "PGRST103"

// 使用者輸入的 % 與 _ 需視為一般字元；再以雙引號包住，避免逗號、括號破壞 or() 篩選語法
function toIlikePattern(query: string) {
  const literal = query.replace(/[\\%_]/g, (char) => `\\${char}`)
  const quoted = `%${literal}%`.replace(/["\\]/g, (char) => `\\${char}`)
  return `"${quoted}"`
}

function getPageCount(total: number) {
  return Math.max(1, Math.ceil(total / ADMIN_POSTS_PAGE_SIZE))
}

async function queryAdminPosts({ query, status }: AdminPostListParams, page: number) {
  const supabase = await createClient()
  const from = (page - 1) * ADMIN_POSTS_PAGE_SIZE

  let request = supabase
    .from("posts")
    .select(ADMIN_POST_LIST_COLUMNS, { count: "exact" })
    .order("updated_at", { ascending: false })
    .order("id", { ascending: true })
    .range(from, from + ADMIN_POSTS_PAGE_SIZE - 1)

  if (status !== POST_STATUS_FILTER.ALL) request = request.eq("status", status)

  if (query) {
    const pattern = toIlikePattern(query)
    request = request.or(`title.ilike.${pattern},slug.ilike.${pattern}`)
  }

  return request.overrideTypes<Array<{ category: CategoryRelation }>, { merge: true }>()
}

// 伺服器端分頁：每次只取一頁資料，並以 count 取得符合條件的總筆數
export async function listAdminPosts(params: AdminPostListParams): Promise<AdminPostListPage> {
  let page = params.page
  let result = await queryAdminPosts(params, page)

  // 刪除最後一頁的所有文章或手動輸入過大的頁碼時，改取最後一頁而不是顯示空白
  if (result.error?.code === RANGE_NOT_SATISFIABLE) {
    const { count } = await queryAdminPosts(params, 1)
    page = getPageCount(count ?? 0)
    result = await queryAdminPosts(params, page)
  }

  const { data, error, count } = result

  if (error) throw new Error(`讀取文章列表失敗：${error.message}`)

  const total = count ?? 0

  return {
    total,
    page,
    pageCount: getPageCount(total),
    posts: data.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      status: post.status,
      viewCount: post.view_count,
      updatedAt: post.updated_at,
      coverImageUrl: post.cover_image_url,
      categoryName: post.category?.name ?? null,
      parentCategoryName: post.category?.parent?.name ?? null,
    })),
  }
}

export async function getEditablePost(id: string): Promise<EditablePost | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, title, slug, excerpt, category_id, cover_image_url, content_json, status, updated_at",
    )
    .eq("id", id)
    .maybeSingle()

  if (error) throw new Error(`讀取文章失敗：${error.message}`)
  if (!data) return null

  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    excerpt: isAutoExcerpt(data.excerpt, data.content_json) ? "" : (data.excerpt ?? ""),
    categoryId: data.category_id,
    coverImageUrl: data.cover_image_url,
    contentJson: data.content_json as JSONContent,
    status: data.status,
    updatedAt: data.updated_at,
  }
}

export type PreviewPost = PostDetail & {
  status: ContentStatus
}

// 草稿預覽：以管理員身分查詢（RLS 允許讀取草稿），不經過前台快取，每次都讀取最後儲存的版本
export async function getPreviewPost(id: string): Promise<PreviewPost | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("posts")
    .select(`${POST_DETAIL_COLUMNS}, status`)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<{ category: CategoryRelation }, { merge: true }>()

  if (error) throw new Error(`讀取預覽文章失敗：${error.message}`)
  if (!data) return null

  return { ...(await toPostDetail(data)), status: data.status }
}

export type ExportablePost = {
  title: string
  slug: string
  status: ContentStatus
  excerpt: string | null
  categoryPath: string | null
  coverImageUrl: string | null
  contentJson: JSONContent
  contentHtml: string
  readingMinutes: number
  viewCount: number
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

// 備份匯出：含草稿在內的全部文章，以管理員身分讀取；依建立時間排序，讓每次匯出的檔案順序一致
export async function listPostsForExport(): Promise<ExportablePost[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("posts")
    .select(
      `title, slug, status, excerpt, cover_image_url, content_json, content_html, reading_time_minutes, view_count, published_at, created_at, updated_at, ${CATEGORY_WITH_PARENT_SELECT}`,
    )
    .order("created_at", { ascending: true })
    .overrideTypes<Array<{ category: CategoryRelation }>, { merge: true }>()

  if (error) throw new Error(`讀取匯出文章失敗：${error.message}`)

  return data.map((post) => ({
    title: post.title,
    slug: post.slug,
    status: post.status,
    excerpt: post.excerpt,
    categoryPath: post.category
      ? [post.category.parent?.name, post.category.name].filter(Boolean).join(" / ")
      : null,
    coverImageUrl: post.cover_image_url,
    contentJson: post.content_json as JSONContent,
    contentHtml: post.content_html,
    readingMinutes: post.reading_time_minutes,
    viewCount: post.view_count,
    publishedAt: post.published_at,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
  }))
}
