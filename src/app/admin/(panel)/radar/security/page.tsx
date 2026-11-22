import type { Metadata, Route } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { BlockedItemsTable } from "@/components/admin/radar/blocked-items-table"
import { KeywordRulesPanel } from "@/components/admin/radar/keyword-rules-panel"
import { RadarSyncForm } from "@/components/admin/radar/radar-sync-form"
import {
  AdvisoryRankingTable,
  KevRankingTable,
} from "@/components/admin/radar/security-ranking-tables"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  RADAR_MODULE,
  SECURITY_TAB,
  SECURITY_TAB_LABEL,
  SECURITY_TOPIC_RULES,
  SECURITY_TOPICS,
  type SecurityTab,
  type SecurityTopic,
} from "@/config/radar"
import { ROUTES } from "@/config/routes"
import {
  getAdminSecurityRanking,
  listAdminKeywordRules,
  listBlockedRadarItems,
} from "@/lib/data/admin-radar"
import { filterByTopic } from "@/lib/radar/security/ranking"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "資安情資",
}

// 「立即同步」的 Server Action 沿用頁面的執行時間上限；資安同步需要下載 KEV 並查詢多個 API
export const maxDuration = 300

const BLOCKED_TAB = "blocked"
const SEARCH_PARAM = { TAB: "tab", TOPIC: "topic" } as const

type AdminTab = SecurityTab | typeof BLOCKED_TAB

const ADMIN_TABS: AdminTab[] = [SECURITY_TAB.KEV, SECURITY_TAB.ADVISORY, BLOCKED_TAB]

function parseTab(value: unknown): AdminTab {
  return ADMIN_TABS.find((tab) => tab === value) ?? SECURITY_TAB.KEV
}

function parseTopic(value: unknown): SecurityTopic | null {
  return SECURITY_TOPICS.find((topic) => topic === value) ?? null
}

function filterHref(tab: SecurityTab, topic: SecurityTopic | null): Route {
  const params = new URLSearchParams({ [SEARCH_PARAM.TAB]: tab })
  if (topic) params.set(SEARCH_PARAM.TOPIC, topic)
  return `${ROUTES.ADMIN_RADAR_SECURITY}?${params}` as Route
}

// 主題篩選以網址參數在伺服器端完成（表格欄位是伺服器元件），切換時保留目前的分頁
function TopicFilter({ tab, topic }: { tab: SecurityTab; topic: SecurityTopic | null }) {
  const options: Array<{ value: SecurityTopic | null; label: string }> = [
    { value: null, label: "全部" },
    ...SECURITY_TOPICS.map((value) => ({ value, label: SECURITY_TOPIC_RULES[value].label })),
  ]

  return (
    <nav
      aria-label="主題"
      className="inline-flex h-9 w-fit max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-muted p-1 text-sm text-muted-foreground"
    >
      {options.map(({ value, label }) => {
        const isActive = value === topic
        return (
          <Link
            key={value ?? "all"}
            href={filterHref(tab, value)}
            aria-current={isActive ? "page" : undefined}
            scroll={false}
            className={cn(
              "flex h-full items-center rounded-md px-3 font-medium whitespace-nowrap transition-colors hover:text-foreground",
              isActive && "bg-background text-foreground shadow-sm",
            )}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

type SecuritySearchParams = PageProps<"/admin/radar/security">["searchParams"]

async function SecurityAdminContent({ searchParams }: { searchParams: SecuritySearchParams }) {
  const params = await searchParams
  const tab = parseTab(params[SEARCH_PARAM.TAB])
  const topic = parseTopic(params[SEARCH_PARAM.TOPIC])

  const [ranking, blocked, rules] = await Promise.all([
    getAdminSecurityRanking(),
    listBlockedRadarItems(RADAR_MODULE.SECURITY),
    listAdminKeywordRules(RADAR_MODULE.SECURITY),
  ])
  const kev = filterByTopic(ranking.kev, topic)
  const advisory = filterByTopic(ranking.advisory, topic)

  return (
    <>
      {/* key 讓切換主題後 Tabs 依網址重新選取分頁 */}
      <Tabs key={`${tab}-${topic ?? "all"}`} defaultValue={tab} className="grid gap-4">
        <TabsList>
          <TabsTrigger value={SECURITY_TAB.KEV}>
            {SECURITY_TAB_LABEL[SECURITY_TAB.KEV]}（{kev.length}）
          </TabsTrigger>
          <TabsTrigger value={SECURITY_TAB.ADVISORY}>
            {SECURITY_TAB_LABEL[SECURITY_TAB.ADVISORY]}（{advisory.length}）
          </TabsTrigger>
          <TabsTrigger value={BLOCKED_TAB}>已隱藏（{blocked.length}）</TabsTrigger>
        </TabsList>
        <TabsContent value={SECURITY_TAB.KEV} className="grid gap-4">
          <TopicFilter tab={SECURITY_TAB.KEV} topic={topic} />
          <KevRankingTable items={kev} filtered={topic !== null} />
        </TabsContent>
        <TabsContent value={SECURITY_TAB.ADVISORY} className="grid gap-4">
          <TopicFilter tab={SECURITY_TAB.ADVISORY} topic={topic} />
          <AdvisoryRankingTable items={advisory} filtered={topic !== null} />
        </TabsContent>
        <TabsContent value={BLOCKED_TAB}>
          <BlockedItemsTable items={blocked} />
        </TabsContent>
      </Tabs>
      <KeywordRulesPanel moduleKey={RADAR_MODULE.SECURITY} rules={rules} />
    </>
  )
}

export default function AdminRadarSecurityPage({
  searchParams,
}: PageProps<"/admin/radar/security">) {
  return (
    <>
      <AdminPageHeader
        title="資安情資"
        description="實戰遭利用（CISA KEV + EPSS）與開發生態漏洞（GitHub Advisory）；每天台灣時間 02:30 左右獨立同步"
      />
      <RadarSyncForm moduleKey={RADAR_MODULE.SECURITY} />
      <Suspense
        fallback={
          <div className="grid gap-4">
            <Skeleton className="h-96 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        }
      >
        <SecurityAdminContent searchParams={searchParams} />
      </Suspense>
    </>
  )
}
