// 對應 supabase/supabase_schema.sql，格式與 `supabase gen types typescript` 輸出一致
// 綱要變更後可改用 CLI 重新產生覆蓋此檔

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Timestamps = {
  created_at: string
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: Timestamps & {
          id: string
          parent_id: string | null
          type: Database["public"]["Enums"]["category_type"]
          name: string
          slug: string
          description: string | null
          sort_order: number
        }
        Insert: Partial<Timestamps> & {
          id?: string
          parent_id?: string | null
          type: Database["public"]["Enums"]["category_type"]
          name: string
          slug: string
          description?: string | null
          sort_order?: number
        }
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: Timestamps & {
          id: string
          author_id: string | null
          category_id: string | null
          title: string
          slug: string
          excerpt: string | null
          cover_image_url: string | null
          content_json: Json
          content_html: string
          status: Database["public"]["Enums"]["post_status"]
          reading_time_minutes: number
          view_count: number
          published_at: string | null
          tldr: string[]
        }
        Insert: Partial<Timestamps> & {
          id?: string
          author_id?: string | null
          category_id?: string | null
          title: string
          slug: string
          excerpt?: string | null
          cover_image_url?: string | null
          content_json?: Json
          content_html?: string
          status?: Database["public"]["Enums"]["post_status"]
          reading_time_minutes?: number
          view_count?: number
          published_at?: string | null
          tldr?: string[]
        }
        Update: Partial<Database["public"]["Tables"]["posts"]["Insert"]>
        Relationships: [
          {
            foreignKeyName: "posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: Timestamps & {
          id: string
          category_id: string | null
          title: string
          slug: string
          summary: string
          description_html: string
          cover_image_url: string | null
          demo_url: string | null
          repo_url: string | null
          tech_stack: string[]
          is_featured: boolean
          sort_order: number
          status: Database["public"]["Enums"]["post_status"]
          published_at: string | null
        }
        Insert: Partial<Timestamps> & {
          id?: string
          category_id?: string | null
          title: string
          slug: string
          summary: string
          description_html?: string
          cover_image_url?: string | null
          demo_url?: string | null
          repo_url?: string | null
          tech_stack?: string[]
          is_featured?: boolean
          sort_order?: number
          status?: Database["public"]["Enums"]["post_status"]
          published_at?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>
        Relationships: [
          {
            foreignKeyName: "projects_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<never, never>
    Functions: {
      increment_post_view: {
        Args: { target_slug: string }
        Returns: undefined
      }
    }
    Enums: {
      post_status: "draft" | "published"
      category_type: "post" | "project"
    }
    CompositeTypes: Record<never, never>
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
