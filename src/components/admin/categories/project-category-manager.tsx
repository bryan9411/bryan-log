"use client"

import { useState } from "react"

import { CategoryPanel } from "@/components/admin/categories/category-panel"
import { FormMessage } from "@/components/forms/form-message"
import { ACTION_STATUS } from "@/lib/actions/action-state"
import { CATEGORY_TYPE } from "@/lib/constants/content"
import type { AdminCategoryNode } from "@/lib/data/admin-categories"

type ProjectCategoryManagerProps = {
  nodes: AdminCategoryNode[]
}

// 作品集只有一組分類，不需要頁籤
export function ProjectCategoryManager({ nodes }: ProjectCategoryManagerProps) {
  const [notice, setNotice] = useState<string | null>(null)

  const maybeRenderNotice = () => {
    if (!notice) return null
    return <FormMessage state={{ status: ACTION_STATUS.SUCCESS, message: notice }} />
  }

  return (
    <div className="grid gap-5">
      {maybeRenderNotice()}
      <CategoryPanel
        type={CATEGORY_TYPE.PROJECT}
        sectionId={null}
        scopeLabel="精選專案"
        nodes={nodes}
        onSuccess={setNotice}
      />
    </div>
  )
}
