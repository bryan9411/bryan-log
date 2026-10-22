"use client"

import { Pie, PieChart } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { CategoryShare } from "@/lib/data/admin-stats"

const CHART_SIZE = 176

const chartConfig = {
  count: { label: "數量" },
} satisfies ChartConfig

type CategoryDonutChartProps = {
  shares: CategoryShare[]
  // 數量單位，例如「篇」、「個」
  unit: string
}

const percentFormatter = new Intl.NumberFormat("zh-TW", {
  style: "percent",
  maximumFractionDigits: 0,
})

// 環形圖搭配圖例清單：每個分類都有名稱、數量與百分比文字，不只靠顏色辨識
export function CategoryDonutChart({ shares, unit }: CategoryDonutChartProps) {
  const total = shares.reduce((sum, share) => sum + share.count, 0)
  // recharts 會讀取每筆資料的 fill 作為扇形與提示框顏色
  const data = shares.map((share) => ({ ...share, fill: share.color }))

  const renderLegendItem = (share: CategoryShare) => (
    <li key={share.key} className="flex items-center gap-2.5 text-sm">
      <span
        className="size-2.5 shrink-0 rounded-[3px]"
        style={{ backgroundColor: share.color }}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate" title={share.name}>
        {share.name}
      </span>
      <span className="text-foreground tabular-nums">
        {share.count} {unit}
      </span>
      <span className="w-10 text-right text-muted-foreground tabular-nums">
        {percentFormatter.format(share.count / total)}
      </span>
    </li>
  )

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: CHART_SIZE, height: CHART_SIZE }}>
        <ChartContainer
          config={chartConfig}
          className="aspect-square size-full"
          initialDimension={{ width: CHART_SIZE, height: CHART_SIZE }}
          aria-hidden
        >
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  nameKey="name"
                  formatter={(value, name, item) => (
                    <div className="flex w-full items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-[3px]"
                        style={{ backgroundColor: item.payload?.fill }}
                      />
                      <span className="text-muted-foreground">{name}</span>
                      <span className="ml-auto pl-3 font-mono font-medium text-foreground tabular-nums">
                        {String(value)} {unit}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Pie
              data={data}
              dataKey="count"
              nameKey="name"
              innerRadius="62%"
              outerRadius="100%"
              stroke="var(--card)"
              strokeWidth={2}
              isAnimationActive={false}
            />
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold">{total}</span>
          <span className="text-xs text-muted-foreground">總計（{unit}）</span>
        </div>
      </div>
      <ul className="grid w-full min-w-0 gap-2.5" aria-label="分類占比">
        {shares.map(renderLegendItem)}
      </ul>
    </div>
  )
}
