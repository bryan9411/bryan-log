"use client"

import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { TopViewedPost } from "@/lib/data/admin-stats"

// 標題過長時在座標軸上截斷，完整標題由提示框與螢幕閱讀器表格提供
const AXIS_LABEL_MAX_LENGTH = 14
const ROW_HEIGHT = 40
const CHART_VERTICAL_PADDING = 8
const AXIS_WIDTH = 176

const chartConfig = {
  views: { label: "瀏覽數", color: "var(--chart-1)" },
} satisfies ChartConfig

type TopPostsChartProps = {
  posts: TopViewedPost[]
}

const truncate = (text: string) =>
  text.length > AXIS_LABEL_MAX_LENGTH ? `${text.slice(0, AXIS_LABEL_MAX_LENGTH)}…` : text

const formatViews = (value: unknown) => Number(value).toLocaleString("zh-TW")

// 單一數列的排行：橫向長條依瀏覽數由高到低排列，數值直接標示在長條末端
export function TopPostsChart({ posts }: TopPostsChartProps) {
  const data = posts.map((post) => ({ ...post, label: truncate(post.title) }))
  const height = data.length * ROW_HEIGHT + CHART_VERTICAL_PADDING * 2

  const renderAccessibleTable = () => (
    <table className="sr-only">
      <caption>文章瀏覽數排行</caption>
      <thead>
        <tr>
          <th scope="col">文章</th>
          <th scope="col">瀏覽數</th>
        </tr>
      </thead>
      <tbody>
        {posts.map((post) => (
          <tr key={post.id}>
            <td>{post.title}</td>
            <td>{formatViews(post.views)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <>
      <ChartContainer
        config={chartConfig}
        className="aspect-auto w-full"
        style={{ height }}
        initialDimension={{ width: 480, height }}
        aria-hidden
      >
        <BarChart
          accessibilityLayer
          data={data}
          layout="vertical"
          margin={{ top: CHART_VERTICAL_PADDING, bottom: CHART_VERTICAL_PADDING, right: 56 }}
          barCategoryGap={10}
        >
          <XAxis type="number" dataKey="views" hide />
          <YAxis
            type="category"
            dataKey="label"
            width={AXIS_WIDTH}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <ChartTooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => payload[0]?.payload.title}
                formatter={(value) => (
                  <div className="flex w-full items-center justify-between gap-4">
                    <span className="text-muted-foreground">瀏覽數</span>
                    <span className="font-mono font-medium text-foreground tabular-nums">
                      {formatViews(value)}
                    </span>
                  </div>
                )}
              />
            }
          />
          <Bar dataKey="views" fill="var(--color-views)" radius={[0, 4, 4, 0]} maxBarSize={22}>
            <LabelList
              dataKey="views"
              position="right"
              offset={8}
              formatter={formatViews}
              className="fill-foreground tabular-nums"
              fontSize={12}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
      {renderAccessibleTable()}
    </>
  )
}
