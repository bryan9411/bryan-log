import Link from "next/link"
import { CircleCheckIcon, CircleHelpIcon, CircleXIcon, GaugeIcon } from "lucide-react"

import { WebVitalValue } from "@/components/admin/dashboard/web-vital-rating"
import { WebVitalTile } from "@/components/admin/dashboard/web-vital-tile"
import { WebVitalsTrendChart } from "@/components/admin/dashboard/web-vitals-trend-chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { adminDashboardVitalsRoute } from "@/config/routes"
import {
  CORE_WEB_VITALS,
  formatWebVital,
  rateWebVital,
  SUPPORTING_WEB_VITALS,
  WEB_VITAL_METRIC,
  WEB_VITAL_RATING,
  WEB_VITALS_DEVICE_FILTER_LABEL,
  WEB_VITALS_RANGE_LABEL,
  webVitalsDeviceFilterSchema,
  webVitalsRangeSchema,
  type WebVitalMetric,
  type WebVitalsFilter,
} from "@/lib/constants/web-vitals"
import { getWebVitalsReport, type WebVitalsPage, type WebVitalsReport } from "@/lib/data/web-vitals"
import { cn } from "@/lib/utils"

const ASSESSMENT = {
  PASSED: "passed",
  FAILED: "failed",
  INSUFFICIENT: "insufficient",
} as const

type Assessment = (typeof ASSESSMENT)[keyof typeof ASSESSMENT]

const ASSESSMENT_DISPLAY: Record<
  Assessment,
  { icon: typeof CircleCheckIcon; color: string; label: string; description: string }
> = {
  [ASSESSMENT.PASSED]: {
    icon: CircleCheckIcon,
    color: "var(--status-good)",
    label: "通過",
    description: "LCP、INP、CLS 的 p75 皆達「良好」門檻",
  },
  [ASSESSMENT.FAILED]: {
    icon: CircleXIcon,
    color: "var(--status-critical)",
    label: "未通過",
    description: "至少一項核心指標的 p75 未達「良好」門檻",
  },
  [ASSESSMENT.INSUFFICIENT]: {
    icon: CircleHelpIcon,
    color: "var(--muted-foreground)",
    label: "資料不足",
    description: "三項核心指標需各有樣本才能評估（INP 需要訪客實際互動才會產生）",
  },
}

const countFormatter = new Intl.NumberFormat("zh-TW")

// 與 Google 搜尋的評估方式相同：三項核心指標的 p75 都在「良好」範圍內才算通過
function assess(summary: WebVitalsReport["summary"]): Assessment {
  const results = CORE_WEB_VITALS.map((metric) => summary[metric])
  if (results.some((result) => !result)) return ASSESSMENT.INSUFFICIENT

  const passed = CORE_WEB_VITALS.every((metric) => {
    const result = summary[metric]
    return result && rateWebVital(metric, result.p75) === WEB_VITAL_RATING.GOOD
  })
  return passed ? ASSESSMENT.PASSED : ASSESSMENT.FAILED
}

type WebVitalsCardProps = {
  filter: WebVitalsFilter
}

export async function WebVitalsCard({ filter }: WebVitalsCardProps) {
  const report = await getWebVitalsReport(filter)
  const hasData = Object.keys(report.summary).length > 0

  const renderFilterLink = (label: string, nextFilter: WebVitalsFilter, isActive: boolean) => (
    <Link
      key={label}
      href={adminDashboardVitalsRoute(nextFilter)}
      scroll={false}
      aria-current={isActive ? "true" : undefined}
      className={cn(
        "rounded-md px-2.5 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground",
        isActive && "bg-background font-medium text-foreground shadow-sm",
      )}
    >
      {label}
    </Link>
  )

  // 篩選列置於圖表上方同一列；以連結切換，可分享網址也支援上一頁
  const renderFilters = () => (
    <div className="flex flex-wrap gap-2">
      <nav aria-label="時間範圍" className="flex rounded-lg bg-muted p-0.5">
        {webVitalsRangeSchema.options.map((range) =>
          renderFilterLink(
            WEB_VITALS_RANGE_LABEL[range],
            { ...filter, range },
            range === filter.range,
          ),
        )}
      </nav>
      <nav aria-label="裝置" className="flex rounded-lg bg-muted p-0.5">
        {webVitalsDeviceFilterSchema.options.map((device) =>
          renderFilterLink(
            WEB_VITALS_DEVICE_FILTER_LABEL[device],
            { ...filter, device },
            device === filter.device,
          ),
        )}
      </nav>
    </div>
  )

  const renderAssessment = () => {
    const assessment = assess(report.summary)
    const { icon: Icon, color, label, description } = ASSESSMENT_DISPLAY[assessment]

    return (
      <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-4">
        <Icon className="mt-0.5 size-5 shrink-0" style={{ color }} aria-hidden />
        <div className="flex flex-col gap-0.5">
          <p className="font-medium">Core Web Vitals 評估：{label}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    )
  }

  const renderPageMetric = (metric: WebVitalMetric, value: number | null) => {
    if (value === null) return <span className="text-muted-foreground">—</span>

    return (
      <WebVitalValue rating={rateWebVital(metric, value)}>
        {formatWebVital(metric, value)}
      </WebVitalValue>
    )
  }

  const renderPageRow = (page: WebVitalsPage) => (
    <TableRow key={page.path}>
      <TableCell className="max-w-64 truncate font-mono text-xs" title={page.path}>
        {page.path}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {countFormatter.format(page.pageLoads)}
      </TableCell>
      <TableCell className="text-right">
        {renderPageMetric(WEB_VITAL_METRIC.LCP, page.lcp)}
      </TableCell>
      <TableCell className="text-right">
        {renderPageMetric(WEB_VITAL_METRIC.INP, page.inp)}
      </TableCell>
      <TableCell className="text-right">
        {renderPageMetric(WEB_VITAL_METRIC.CLS, page.cls)}
      </TableCell>
    </TableRow>
  )

  const maybeRenderPages = () => {
    if (report.pages.length === 0) return null

    return (
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">各頁面表現（依載入次數排序）</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>頁面</TableHead>
              <TableHead className="text-right">載入次數</TableHead>
              <TableHead className="text-right">LCP</TableHead>
              <TableHead className="text-right">INP</TableHead>
              <TableHead className="text-right">CLS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.pages.map(renderPageRow)}</TableBody>
        </Table>
      </div>
    )
  }

  const renderContent = () => {
    if (!hasData) {
      return (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
          <GaugeIcon className="size-6 text-muted-foreground" aria-hidden />
          <p className="font-medium">此範圍內尚無效能資料</p>
          <p className="max-w-md text-sm text-pretty text-muted-foreground">
            正式環境的訪客瀏覽前台頁面後，離開或切換分頁時會回報指標；本機開發模式不會收集。
          </p>
        </div>
      )
    }

    return (
      <>
        {renderAssessment()}
        <div className="grid gap-3 md:grid-cols-3">
          {CORE_WEB_VITALS.map((metric) => (
            <WebVitalTile key={metric} metric={metric} summary={report.summary[metric]} />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {SUPPORTING_WEB_VITALS.map((metric) => (
            <WebVitalTile
              key={metric}
              metric={metric}
              summary={report.summary[metric]}
              size="compact"
            />
          ))}
        </div>
        <WebVitalsTrendChart daily={report.daily} />
        {maybeRenderPages()}
      </>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>效能監控（Core Web Vitals）</CardTitle>
        <CardDescription>
          前台真實訪客的量測值，以第 75 百分位數（p75）評估；不含後台與草稿預覽
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {renderFilters()}
        {renderContent()}
      </CardContent>
    </Card>
  )
}
