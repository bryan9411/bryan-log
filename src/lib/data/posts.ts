import "server-only"

import type { JSONContent } from "@tiptap/core"

import type { ContentStatus } from "@/lib/constants/content"
import { isAutoExcerpt } from "@/lib/content/render-post"
import { createClient } from "@/lib/supabase/server"

export type AdminPostListItem = {
  id: string
  title: string
  slug: string
  status: ContentStatus
  viewCount: number
  updatedAt: string
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

const ADMIN_POST_LIST_COLUMNS =
  "id, title, slug, status, view_count, updated_at, category:categories(name, parent:parent_id(name))"

type CategoryRelation = { name: string; parent: { name: string } | null } | null

export async function listAdminPosts(): Promise<AdminPostListItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("posts")
    .select(ADMIN_POST_LIST_COLUMNS)
    .order("updated_at", { ascending: false })
    .overrideTypes<Array<{ category: CategoryRelation }>, { merge: true }>()

  if (error) throw new Error(`讀取文章列表失敗：${error.message}`)

  return data.map((post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    status: post.status,
    viewCount: post.view_count,
    updatedAt: post.updated_at,
    categoryName: post.category?.name ?? null,
    parentCategoryName: post.category?.parent?.name ?? null,
  }))
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
