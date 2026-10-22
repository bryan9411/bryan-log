"use client"

import { useState } from "react"
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CORE_WEB_VITALS,
  formatWebVital,
  WEB_VITAL_DEFINITION,
  webVitalMetricSchema,
  type WebVitalMetric,
} from "@/lib/constants/web-vitals"
import type { WebVitalsDailyPoint } from "@/lib/data/web-vitals"

const CHART_HEIGHT = 240
// 門檻線需完整出現在圖上，Y 軸上限至少比「不佳」門檻多留一點空間
const DOMAIN_HEADROOM = 1.1
// X 軸約顯示的日期刻度數，依範圍天數換算固定間隔，刻度才會等距
const TARGET_X_TICKS = 7

const chartConfig = {
  p75: { label: "p75", color: "var(--chart-1)" },
} satisfies ChartConfig

type WebVitalsTrendChartProps = {
  daily: WebVitalsDailyPoint[]
}

const dayLabelFormatter = new Intl.DateTimeFormat("zh-TW", {
  month: "numeric",
  day: "numeric",
  timeZone: "UTC",
})

const MAX_Y_TICKS = 7

// 將上限進位到整齊的數字（例如 4400 → 5000、0.275 → 0.3），並以固定間距產生刻度，
// 刻度才不會出現 4.6 秒、1.5 秒這類不等距的零散值
function buildYAxis(value: number) {
  const magnitude = 10 ** Math.floor(Math.log10(value))
  // 以整數單位計算（例如 0.275 → 3 個 0.1），避免 3 × 0.1 ≠ 0.3 的浮點誤差
  const units = Math.ceil(value / magnitude)
  const stepUnits = units + 1 > MAX_Y_TICKS ? 2 : 1
  const maxUnits = Math.ceil(units / stepUnits) * stepUnits
  const ticks = Array.from({ length: maxUnits / stepUnits + 1 }, (_, index) =>
    Number((index * stepUnits * magnitude).toPrecision(6)),
  )

  return { max: ticks[ticks.length - 1], ticks }
}

// day 為台北時間的日期字串，以 UTC 解析再以 UTC 格式化，日期不會因瀏覽器時區偏移
const formatDay = (day: string) => dayLabelFormatter.format(new Date(`${day}T00:00:00Z`))

// 單一數列趨勢：一次只看一項指標的每日 p75，搭配「良好」與「不佳」兩條門檻虛線判讀
export function WebVitalsTrendChart({ daily }: WebVitalsTrendChartProps) {
  const [metric, setMetric] = useState<WebVitalMetric>(CORE_WEB_VITALS[0])

  const { thresholds } = WEB_VITAL_DEFINITION[metric]
  const data = daily.map((point) => ({ day: point.day, p75: point[metric] ?? null }))
  const maxValue = Math.max(thresholds.poor, ...data.map((point) => point.p75 ?? 0))
  const yAxis = buildYAxis(maxValue * DOMAIN_HEADROOM)
  const xTickInterval = Math.max(Math.ceil(data.length / TARGET_X_TICKS) - 1, 0)
  const hasData = data.some((point) => point.p75 !== null)

  const handleMetricChange = (value: string) => {
    const result = webVitalMetricSchema.safeParse(value)
    if (result.success) setMetric(result.data)
  }

  const renderThreshold = (value: number, label: string) => (
    <ReferenceLine
      y={value}
      stroke="var(--muted-foreground)"
      strokeDasharray="4 4"
      strokeOpacity={0.6}
      label={{
        value: `${label} ${formatWebVital(metric, value)}`,
        position: "insideTopRight",
        fill: "var(--muted-foreground)",
        fontSize: 11,
      }}
    />
  )

  const renderAccessibleTable = () => (
    <table className="sr-only">
      <caption>{metric} 每日 p75</caption>
      <thead>
        <tr>
          <th scope="col">日期</th>
          <th scope="col">p75</th>
        </tr>
      </thead>
      <tbody>
        {data.map((point) => (
          <tr key={point.day}>
            <td>{point.day}</td>
            <td>{point.p75 === null ? "無資料" : formatWebVital(metric, point.p75)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  const renderChart = () => {
    if (!hasData) {
      return (
        <p
          className="flex items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground"
          style={{ height: CHART_HEIGHT }}
        >
          此範圍內尚無 {metric} 資料
        </p>
      )
    }

    return (
      <>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto w-full"
          style={{ height: CHART_HEIGHT }}
          initialDimension={{ width: 640, height: CHART_HEIGHT }}
          aria-hidden
        >
          <LineChart data={data} margin={{ top: 16, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeOpacity={0.5} />
            <XAxis
              dataKey="day"
              tickFormatter={formatDay}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={xTickInterval}
              padding={{ left: 8, right: 8 }}
            />
            <YAxis
              domain={[0, yAxis.max]}
              ticks={yAxis.ticks}
              tickFormatter={(value: number) => formatWebVital(metric, value)}
              tickLine={false}
              axisLine={false}
              width={72}
            />
            {renderThreshold(thresholds.good, "良好")}
            {renderThreshold(thresholds.poor, "不佳")}
            <ChartTooltip
              cursor={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.4 }}
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => formatDay(payload[0]?.payload.day)}
                  formatter={(value) => (
                    <div className="flex w-full items-center justify-between gap-4">
                      <span className="text-muted-foreground">{metric} p75</span>
                      <span className="font-mono font-medium text-foreground tabular-nums">
                        {formatWebVital(metric, Number(value))}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Line
              dataKey="p75"
              type="monotone"
              stroke="var(--color-p75)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--color-p75)", strokeWidth: 0 }}
              activeDot={{ r: 5, stroke: "var(--background)", strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ChartContainer>
        {renderAccessibleTable()}
      </>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-medium">每日 p75 趨勢</h3>
        <Tabs value={metric} onValueChange={handleMetricChange}>
          <TabsList aria-label="選擇指標">
            {CORE_WEB_VITALS.map((item) => (
              <TabsTrigger key={item} value={item} className="font-mono">
                {item}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      {renderChart()}
    </div>
  )
}
