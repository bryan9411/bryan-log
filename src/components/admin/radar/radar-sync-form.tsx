"use client"

import { useActionState } from "react"
import { RefreshCwIcon } from "lucide-react"

import { FormMessage } from "@/components/forms/form-message"
import { SubmitButton } from "@/components/forms/submit-button"
import type { RadarModuleKey } from "@/config/radar"
import { initialActionState } from "@/lib/actions/action-state"
import { syncRadarModuleAction } from "@/lib/actions/radar"
import { RADAR_SYNC_FIELD } from "@/lib/validations/radar"

export function RadarSyncForm({ moduleKey }: { moduleKey: RadarModuleKey }) {
  const [state, formAction] = useActionState(syncRadarModuleAction, initialActionState)

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name={RADAR_SYNC_FIELD} value={moduleKey} />
      <div>
        <SubmitButton variant="outline" pendingText="同步中…">
          <RefreshCwIcon aria-hidden />
          立即同步
        </SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  )
}
