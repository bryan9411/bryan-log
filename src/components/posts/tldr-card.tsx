import { ZapIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// JSON-LD 的 speakable 以此選擇器指向速讀卡片，告訴語音助理與 AI 搜尋這是最適合朗讀與引用的段落
export const TLDR_CARD_CLASS = "post-tldr"

type TldrCardProps = {
  points: string[]
}

// 文章頂部的結論摘要：讓讀者先掌握重點，也提供 AI 搜尋一段可直接引用的精簡答案
export function TldrCard({ points }: TldrCardProps) {
  if (points.length === 0) return null

  return (
    <section
      aria-labelledby="tldr-heading"
      className={cn(
        TLDR_CARD_CLASS,
        "rounded-xl border border-l-4 border-l-chart-1 bg-card px-5 py-4",
      )}
    >
      <h2
        id="tldr-heading"
        className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold tracking-wide"
      >
        <ZapIcon className="size-4 text-chart-1" aria-hidden />
        TL;DR 核心速讀
      </h2>
      <ul className="grid list-disc gap-1.5 pl-5 text-[0.95rem] leading-relaxed text-foreground/90 marker:text-chart-1">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </section>
  )
}
