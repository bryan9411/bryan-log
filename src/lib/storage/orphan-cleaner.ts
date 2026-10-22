import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { connection } from "next/server"

import { createClient } from "@/lib/supabase/server"
import {
  ORPHAN_GRACE_PERIOD_MS,
  STORAGE_BUCKET,
  STORAGE_DELETE_BATCH_SIZE,
  STORAGE_LIST_PAGE_SIZE,
} from "@/lib/storage/constants"
import { extractStoragePaths, getPublicUrlPrefix } from "@/lib/storage/paths"
import type { Database } from "@/types/database"

type TypedClient = SupabaseClient<Database>

export type StoredObject = {
  path: string
  size: number
  createdAt: string | null
}

export type OrphanScanReport = {
  scannedAt: string
  totalFiles: number
  totalBytes: number
  referencedFiles: number
  referencedBytes: number
  orphans: StoredObject[]
  orphanBytes: number
  // 寬限期內的未引用檔案：可能是編輯中尚未存檔的圖片，本次不列入清理
  recentUnreferencedFiles: number
  recentUnreferencedBytes: number
}

export type OrphanCleanupResult = {
  deletedCount: number
  freedBytes: number
  failedPaths: string[]
}

// Supabase Storage 的 list 只回傳單層，資料夾以 id 為 null 表示，需逐層展開並分頁讀取
async function listAllObjects(supabase: TypedClient): Promise<StoredObject[]> {
  const bucket = supabase.storage.from(STORAGE_BUCKET)
  const pendingFolders = [""]
  const objects: StoredObject[] = []

  while (pendingFolders.length > 0) {
    const folder = pendingFolders.shift() ?? ""

    for (let offset = 0; ; offset += STORAGE_LIST_PAGE_SIZE) {
      const { data, error } = await bucket.list(folder, {
        limit: STORAGE_LIST_PAGE_SIZE,
        offset,
        sortBy: { column: "name", order: "asc" },
      })

      if (error) throw new Error(`讀取儲存空間失敗：${error.message}`)

      data.forEach((entry) => {
        const path = folder ? `${folder}/${entry.name}` : entry.name

        if (entry.id === null) {
          pendingFolders.push(path)
          return
        }

        objects.push({
          path,
          size: Number(entry.metadata?.size ?? 0),
          createdAt: entry.created_at ?? null,
        })
      })

      if (data.length < STORAGE_LIST_PAGE_SIZE) break
    }
  }

  return objects
}

// 讀取失敗時直接拋錯中止，寧可不清理也不能在引用清單不完整的情況下誤刪檔案
async function collectReferencedPaths(supabase: TypedClient): Promise<Set<string>> {
  const prefix = getPublicUrlPrefix()

  const [postsResult, projectsResult] = await Promise.all([
    supabase.from("posts").select("content_html, cover_image_url"),
    supabase.from("projects").select("description_html, cover_image_url"),
  ])

  if (postsResult.error) throw new Error(`讀取文章引用失敗：${postsResult.error.message}`)
  if (projectsResult.error) throw new Error(`讀取作品引用失敗：${projectsResult.error.message}`)

  const sources = [
    ...postsResult.data.flatMap((post) => [post.content_html, post.cover_image_url]),
    ...projectsResult.data.flatMap((project) => [
      project.description_html,
      project.cover_image_url,
    ]),
  ]

  const referenced = new Set<string>()

  sources.forEach((source) => {
    extractStoragePaths(source, prefix).forEach((path) => referenced.add(path))
  })

  return referenced
}

function isWithinGracePeriod(object: StoredObject, now: number) {
  if (!object.createdAt) return true
  return now - new Date(object.createdAt).getTime() < ORPHAN_GRACE_PERIOD_MS
}

const sumBytes = (objects: StoredObject[]) => objects.reduce((sum, object) => sum + object.size, 0)

// 必須以已認證的 Client 執行：RLS 下匿名身分讀不到草稿，會把草稿圖片誤判為未引用檔案
export async function scanOrphanFiles(): Promise<OrphanScanReport> {
  await connection()
  const supabase = await createClient()
  const now = Date.now()

  const [objects, referenced] = await Promise.all([
    listAllObjects(supabase),
    collectReferencedPaths(supabase),
  ])

  const unreferenced = objects.filter((object) => !referenced.has(object.path))
  const orphans = unreferenced.filter((object) => !isWithinGracePeriod(object, now))
  const totalBytes = sumBytes(objects)
  const unreferencedBytes = sumBytes(unreferenced)
  const orphanBytes = sumBytes(orphans)

  return {
    scannedAt: new Date(now).toISOString(),
    totalFiles: objects.length,
    totalBytes,
    referencedFiles: objects.length - unreferenced.length,
    referencedBytes: totalBytes - unreferencedBytes,
    orphans,
    orphanBytes,
    recentUnreferencedFiles: unreferenced.length - orphans.length,
    recentUnreferencedBytes: unreferencedBytes - orphanBytes,
  }
}

// 刪除前一律在伺服器端重新掃描，絕不信任客戶端傳來的檔案清單
export async function cleanupOrphanFiles(): Promise<OrphanCleanupResult> {
  await connection()
  const supabase = await createClient()
  const { orphans } = await scanOrphanFiles()
  const bucket = supabase.storage.from(STORAGE_BUCKET)

  const result: OrphanCleanupResult = { deletedCount: 0, freedBytes: 0, failedPaths: [] }

  for (let index = 0; index < orphans.length; index += STORAGE_DELETE_BATCH_SIZE) {
    const batch = orphans.slice(index, index + STORAGE_DELETE_BATCH_SIZE)
    const { data, error } = await bucket.remove(batch.map((object) => object.path))

    if (error) {
      result.failedPaths.push(...batch.map((object) => object.path))
      continue
    }

    const removedPaths = new Set(data.map((object) => object.name))

    batch.forEach((object) => {
      if (removedPaths.has(object.path)) {
        result.deletedCount += 1
        result.freedBytes += object.size
      } else {
        result.failedPaths.push(object.path)
      }
    })
  }

  return result
}
