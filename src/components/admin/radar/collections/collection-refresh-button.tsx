"use client"

import { useState, useTransition } from "react"
import { Loader2Icon, RefreshCwIcon } from "lucide-react"

import { FormMessage } from "@/components/forms/form-message"
import { Button } from "@/components/ui/button"
import { initialActionState, type ActionState } from "@/lib/actions/action-state"
import { refreshRadarCollectionAction } from "@/lib/actions/radar-collections"

// 成功後 Server Action 重新驗證詳細頁，對照表換成剛取得的最新數據
export function CollectionRefreshButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<ActionState>(initialActionState)

  const handleClick = () => {
    setResult(initialActionState)
    startTransition(async () => {
      setResult(await refreshRadarCollectionAction(id))
    })
  }

  return (
    <div className="grid justify-items-end gap-2">
      <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleClick}>
        {isPending ? (
          <Loader2Icon className="animate-spin" aria-hidden />
        ) : (
          <RefreshCwIcon aria-hidden />
        )}
        {isPending ? "向來源查詢中…" : "重新整理最新數據"}
      </Button>
      <FormMessage state={result} className="py-1.5" />
    </div>
  )
}
