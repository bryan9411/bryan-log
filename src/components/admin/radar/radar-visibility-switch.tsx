"use client"

import { useOptimistic, useState, useTransition } from "react"

import { Switch } from "@/components/ui/switch"
import {
  RADAR_VISIBILITY,
  RADAR_VISIBILITY_LABEL,
  type RadarModuleKey,
  type RadarVisibility,
} from "@/config/radar"
import { ACTION_STATUS } from "@/lib/actions/action-state"
import { setRadarModuleVisibilityAction } from "@/lib/actions/radar"

type RadarVisibilitySwitchProps = {
  moduleKey: RadarModuleKey
  label: string
  visibility: RadarVisibility
}

export function RadarVisibilitySwitch({
  moduleKey,
  label,
  visibility,
}: RadarVisibilitySwitchProps) {
  const [isPending, startTransition] = useTransition()
  const [optimisticVisibility, setOptimisticVisibility] = useOptimistic(visibility)
  const [error, setError] = useState<string | null>(null)
  const isPublic = optimisticVisibility === RADAR_VISIBILITY.PUBLIC

  const toggle = (checked: boolean) => {
    const next = checked ? RADAR_VISIBILITY.PUBLIC : RADAR_VISIBILITY.HIDDEN
    setError(null)
    startTransition(async () => {
      setOptimisticVisibility(next)
      const result = await setRadarModuleVisibilityAction(moduleKey, next)
      if (result.status === ACTION_STATUS.ERROR) setError(result.message)
    })
  }

  const maybeRenderError = () => {
    if (!error) return null
    return (
      <p role="alert" className="text-xs text-destructive">
        {error}
      </p>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <label className="flex items-center gap-2 text-sm">
        <span className={isPublic ? "font-medium" : "text-muted-foreground"}>
          {RADAR_VISIBILITY_LABEL[optimisticVisibility]}
        </span>
        <Switch
          checked={isPublic}
          disabled={isPending}
          onCheckedChange={toggle}
          aria-label={`公開「${label}」`}
        />
      </label>
      {maybeRenderError()}
    </div>
  )
}
