"use client"

import { useState, useTransition } from "react"
import { EyeIcon, EyeOffIcon, Loader2Icon, SearchIcon, Trash2Icon } from "lucide-react"

import { FormMessage } from "@/components/forms/form-message"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  RADAR_KEYWORD_LENGTH,
  RADAR_KEYWORD_RULE_KIND,
  RADAR_KEYWORD_RULE_KIND_LABEL,
  type RadarKeywordRuleKind,
  type RadarModuleKey,
} from "@/config/radar"
import { initialActionState, type ActionState } from "@/lib/actions/action-state"
import {
  addRadarKeywordRuleAction,
  previewRadarKeywordRuleAction,
  removeRadarKeywordRuleAction,
} from "@/lib/actions/radar"
import type { RadarKeywordRule } from "@/lib/radar/keyword-rules"

type KeywordRulesPanelProps = {
  moduleKey: RadarModuleKey
  rules: RadarKeywordRule[]
}

const KIND_HINT: Record<RadarKeywordRuleKind, string> = {
  [RADAR_KEYWORD_RULE_KIND.EXCLUDE]:
    "命中的項目自動隱藏，原因記為「排除關鍵字」；刪除規則後自動還原（手動隱藏的不受影響）。",
  [RADAR_KEYWORD_RULE_KIND.WATCH]: "命中的項目加上「關注」徽章，不影響名次。",
}

const KIND_ICON = {
  [RADAR_KEYWORD_RULE_KIND.EXCLUDE]: EyeOffIcon,
  [RADAR_KEYWORD_RULE_KIND.WATCH]: EyeIcon,
}

type Preview = { keyword: string; count: number }

function RuleList({
  kind,
  moduleKey,
  rules,
  onResult,
}: {
  kind: RadarKeywordRuleKind
  moduleKey: RadarModuleKey
  rules: RadarKeywordRule[]
  onResult: (state: ActionState) => void
}) {
  const [keyword, setKeyword] = useState("")
  const [preview, setPreview] = useState<Preview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const label = RADAR_KEYWORD_RULE_KIND_LABEL[kind]
  const Icon = KIND_ICON[kind]
  const inputId = `keyword-${kind}`

  // 第一步只預覽命中筆數，確認後才寫入；關鍵字改動時清除預覽，避免套用到和預覽不同的字
  const handlePreview = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPreviewError(null)
    startTransition(async () => {
      const result = await previewRadarKeywordRuleAction(moduleKey, keyword)
      if (result.status === "error") {
        setPreview(null)
        setPreviewError(result.message)
        return
      }
      setPreview({ keyword: result.keyword, count: result.count })
    })
  }

  const handleConfirm = () => {
    if (!preview) return
    startTransition(async () => {
      const result = await addRadarKeywordRuleAction(moduleKey, kind, preview.keyword)
      onResult(result)
      if (result.status === "success") {
        setKeyword("")
        setPreview(null)
      }
    })
  }

  const handleRemove = (rule: RadarKeywordRule) => {
    setPendingId(rule.id)
    startTransition(async () => {
      onResult(await removeRadarKeywordRuleAction(rule.id))
      setPendingId(null)
    })
  }

  const maybeRenderPreview = () => {
    if (previewError) {
      return (
        <p role="alert" className="text-sm text-destructive">
          {previewError}
        </p>
      )
    }
    if (!preview) return null
    return (
      <div
        role="status"
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/50 px-3 py-2 text-sm"
      >
        <span>
          「<span className="font-medium">{preview.keyword}</span>」目前會命中{" "}
          <span className="font-semibold tabular-nums">{preview.count}</span> 筆
        </span>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setPreview(null)}>
            取消
          </Button>
          <Button type="button" size="sm" disabled={isPending} onClick={handleConfirm}>
            {isPending ? <Loader2Icon className="animate-spin" aria-hidden /> : null}
            確認新增
          </Button>
        </div>
      </div>
    )
  }

  const renderRules = () => {
    if (rules.length === 0) {
      return <p className="text-sm text-muted-foreground">還沒有{label}。</p>
    }
    return (
      <ul className="flex flex-wrap gap-2" aria-label={label}>
        {rules.map((rule) => (
          <li key={rule.id}>
            <Badge variant="outline" className="h-7 gap-1.5 pr-1 pl-2.5 text-sm font-normal">
              {rule.keyword}
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleRemove(rule)}
                aria-label={`刪除${label}「${rule.keyword}」`}
                className="flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                {pendingId === rule.id ? (
                  <Loader2Icon className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Trash2Icon className="size-3.5" aria-hidden />
                )}
              </button>
            </Badge>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="grid content-start gap-4">
      <div className="grid gap-1">
        <h3 className="flex items-center gap-2 font-medium">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          {label}
          <span className="text-sm font-normal text-muted-foreground tabular-nums">
            （{rules.length}）
          </span>
        </h3>
        <p className="text-sm text-muted-foreground">{KIND_HINT[kind]}</p>
      </div>
      {renderRules()}
      <form onSubmit={handlePreview} className="flex gap-2">
        <label htmlFor={inputId} className="sr-only">
          新增{label}
        </label>
        <Input
          id={inputId}
          value={keyword}
          minLength={RADAR_KEYWORD_LENGTH.MIN}
          maxLength={RADAR_KEYWORD_LENGTH.MAX}
          required
          placeholder="例如 wordpress"
          onChange={(event) => {
            setKeyword(event.target.value)
            setPreview(null)
            setPreviewError(null)
          }}
        />
        <Button type="submit" variant="outline" disabled={isPending}>
          {isPending && !preview && !pendingId ? (
            <Loader2Icon className="animate-spin" aria-hidden />
          ) : (
            <SearchIcon aria-hidden />
          )}
          預覽
        </Button>
      </form>
      {maybeRenderPreview()}
    </div>
  )
}

// 關鍵字以「整個單字」比對標題、摘要、套件、廠商／產品與 CVE／GHSA 編號，不分大小寫
export function KeywordRulesPanel({ moduleKey, rules }: KeywordRulesPanelProps) {
  const [message, setMessage] = useState<ActionState>(initialActionState)

  const rulesByKind = (kind: RadarKeywordRuleKind) => rules.filter((rule) => rule.kind === kind)

  return (
    <Card>
      <CardHeader>
        <CardTitle>關鍵字規則</CardTitle>
        <CardDescription>
          以「整個單字」比對標題、摘要、套件、廠商／產品與 CVE／GHSA
          編號，不分大小寫；同步時與新增、刪除規則後都會重新套用。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <FormMessage state={message} />
        <div className="grid gap-8 lg:grid-cols-2">
          {[RADAR_KEYWORD_RULE_KIND.EXCLUDE, RADAR_KEYWORD_RULE_KIND.WATCH].map((kind) => (
            <RuleList
              key={kind}
              kind={kind}
              moduleKey={moduleKey}
              rules={rulesByKind(kind)}
              onResult={setMessage}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
