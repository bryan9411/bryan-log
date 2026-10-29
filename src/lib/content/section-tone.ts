// 首頁混合多個區塊的文章時，以顏色區分所屬區塊；依後台排序循環取色，區塊再多也不會缺色
const SECTION_TONES = [
  "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
] as const

export function getSectionTone(index: number) {
  return SECTION_TONES[index % SECTION_TONES.length]
}
