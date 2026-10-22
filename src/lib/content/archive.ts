import type { PostSummary } from "@/lib/data/public-posts"

export type ArchivePost = PostSummary & { day: number; publishedAt: string }

export type ArchiveMonth = {
  // 1～12
  month: number
  posts: ArchivePost[]
}

export type ArchiveYear = {
  year: number
  postCount: number
  months: ArchiveMonth[]
}

// 與全站日期顯示一致，以台北時間判斷年月，避免跨年、跨月深夜發布的文章被歸到前一個月
const datePartsFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: "Asia/Taipei",
})

function toDateParts(value: string) {
  const parts = datePartsFormatter.formatToParts(new Date(value))
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)

  return { year: read("year"), month: read("month"), day: read("day") }
}

export function archiveYearId(year: number) {
  return `year-${year}`
}

// 依「年 → 月」分組；輸入需已依發布時間由新到舊排序，輸出維持相同順序
export function groupPostsByMonth(posts: PostSummary[]): ArchiveYear[] {
  const years: ArchiveYear[] = []

  posts.forEach((post) => {
    const { publishedAt } = post
    if (!publishedAt) return

    const { year, month, day } = toDateParts(publishedAt)

    let archiveYear = years.at(-1)
    if (archiveYear?.year !== year) {
      archiveYear = { year, postCount: 0, months: [] }
      years.push(archiveYear)
    }

    let archiveMonth = archiveYear.months.at(-1)
    if (archiveMonth?.month !== month) {
      archiveMonth = { month, posts: [] }
      archiveYear.months.push(archiveMonth)
    }

    archiveMonth.posts.push({ ...post, publishedAt, day })
    archiveYear.postCount += 1
  })

  return years
}
