// 對應 supabase/supabase_schema.sql，格式與 `supabase gen types typescript` 輸出一致
// 綱要變更後可改用 CLI 重新產生覆蓋此檔

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// 雷達各模組排名函式共用的欄位：前台卡片只依賴這些欄位，score 為排名依據（GitHub 為 7 日新增 star、HN 為分數）
type RadarRankingRow = {
  item_id: string
  title: string
  url: string
  summary: string | null
  categories: string[]
  data: Json
  score: number
  total: number
}

type RadarGithubRankingRow = RadarRankingRow & {
  window_days: number
  latest_date: string
}

type RadarHnRankingRow = RadarRankingRow

type Timestamps = {
  created_at: string
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      sections: {
        Row: Timestamps & {
          id: string
          name: string
          slug: string
          description: string | null
          cover_image_url: string | null
          sort_order: number
        }
        Insert: Partial<Timestamps> & {
          id?: string
          name: string
          slug: string
          description?: string | null
          cover_image_url?: string | null
          sort_order?: number
        }
        Update: Partial<Database["public"]["Tables"]["sections"]["Insert"]>
        Relationships: []
      }
      categories: {
        Row: Timestamps & {
          id: string
          parent_id: string | null
          type: Database["public"]["Enums"]["category_type"]
          section_id: string | null
          name: string
          slug: string
          description: string | null
          sort_order: number
        }
        Insert: Partial<Timestamps> & {
          id?: string
          parent_id?: string | null
          type: Database["public"]["Enums"]["category_type"]
          section_id?: string | null
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
          {
            foreignKeyName: "categories_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: Timestamps & {
          id: string
          author_id: string | null
          section_id: string
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
          section_id: string
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
          {
            foreignKeyName: "posts_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
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
      web_vitals: {
        Row: {
          id: number
          metric: string
          value: number
          rating: string
          path: string
          device: string
          created_at: string
        }
        Insert: {
          id?: never
          metric: string
          value: number
          rating: string
          path: string
          device: string
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["web_vitals"]["Insert"]>
        Relationships: []
      }
      radar_modules: {
        Row: {
          key: string
          name: string
          visibility: Database["public"]["Enums"]["radar_visibility"]
          sort_order: number
          last_synced_at: string | null
          last_sync_status: "success" | "failed" | null
          last_sync_error: string | null
          updated_at: string
        }
        Insert: {
          key: string
          name: string
          visibility?: Database["public"]["Enums"]["radar_visibility"]
          sort_order?: number
          last_synced_at?: string | null
          last_sync_status?: "success" | "failed" | null
          last_sync_error?: string | null
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["radar_modules"]["Insert"]>
        Relationships: []
      }
      radar_items: {
        Row: {
          id: string
          module_key: string
          external_id: string
          title: string
          url: string
          summary: string | null
          categories: string[]
          data: Json
          is_blocked: boolean
          blocked_at: string | null
          first_seen_at: string
          last_seen_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          module_key: string
          external_id: string
          title: string
          url: string
          summary?: string | null
          categories?: string[]
          data?: Json
          is_blocked?: boolean
          blocked_at?: string | null
          first_seen_at?: string
          last_seen_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["radar_items"]["Insert"]>
        Relationships: [
          {
            foreignKeyName: "radar_items_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "radar_modules"
            referencedColumns: ["key"]
          },
        ]
      }
      radar_metric_snapshots: {
        Row: {
          item_id: string
          snapshot_date: string
          value: number
        }
        Insert: {
          item_id: string
          snapshot_date: string
          value: number
        }
        Update: Partial<Database["public"]["Tables"]["radar_metric_snapshots"]["Insert"]>
        Relationships: [
          {
            foreignKeyName: "radar_metric_snapshots_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "radar_items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<never, never>
    Functions: {
      increment_post_view: {
        Args: { target_slug: string }
        Returns: number | null
      }
      record_web_vitals: {
        Args: { entries: Json }
        Returns: undefined
      }
      get_web_vitals_summary: {
        Args: { since: string; device_filter?: string | null }
        Returns: Array<{
          metric: string
          p75: number
          samples: number
          good: number
          needs_improvement: number
          poor: number
        }>
      }
      get_web_vitals_daily: {
        Args: { since: string; device_filter?: string | null }
        Returns: Array<{ day: string; metric: string; p75: number; samples: number }>
      }
      get_web_vitals_pages: {
        Args: { since: string; device_filter?: string | null; page_limit?: number }
        Returns: Array<{
          path: string
          page_loads: number
          lcp_p75: number | null
          inp_p75: number | null
          cls_p75: number | null
        }>
      }
      get_public_radar_modules: {
        Args: Record<PropertyKey, never>
        Returns: Array<{
          key: string
          name: string
          sort_order: number
          last_synced_at: string | null
        }>
      }
      radar_github_ranking: {
        Args: { p_limit?: number }
        Returns: Array<RadarGithubRankingRow>
      }
      get_github_weekly_ranking: {
        Args: { p_limit?: number }
        Returns: Array<RadarGithubRankingRow>
      }
      radar_hn_ranking: {
        Args: { p_show_hn: boolean; p_limit?: number }
        Returns: Array<RadarHnRankingRow>
      }
      get_hn_weekly_ranking: {
        Args: { p_show_hn: boolean; p_limit?: number }
        Returns: Array<RadarHnRankingRow>
      }
    }
    Enums: {
      post_status: "draft" | "published"
      category_type: "post" | "project"
      radar_visibility: "hidden" | "public"
    }
    CompositeTypes: Record<never, never>
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
