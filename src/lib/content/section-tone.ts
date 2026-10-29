// 首頁混合多個區塊的內容時，以顏色區分所屬區塊；依後台排序循環取色，區塊再多也不會缺色
// badge：文章列表的區塊標籤；cover：未上傳封面時的預設封面底色與文字色
type SectionTone = {
  badge: string
  cover: string
}

const SECTION_TONES: readonly SectionTone[] = [
  {
    badge: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    cover: "from-sky-500/30 via-sky-500/10 to-transparent text-sky-700/80 dark:text-sky-300/80",
  },
  {
    badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    cover:
      "from-emerald-500/30 via-emerald-500/10 to-transparent text-emerald-700/80 dark:text-emerald-300/80",
  },
  {
    badge: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    cover:
      "from-amber-500/30 via-amber-500/10 to-transparent text-amber-700/80 dark:text-amber-300/80",
  },
  {
    badge: "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    cover:
      "from-violet-500/30 via-violet-500/10 to-transparent text-violet-700/80 dark:text-violet-300/80",
  },
  {
    badge: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    cover: "from-rose-500/30 via-rose-500/10 to-transparent text-rose-700/80 dark:text-rose-300/80",
  },
]

export function getSectionTone(index: number): SectionTone {
  return SECTION_TONES[index % SECTION_TONES.length]
}
