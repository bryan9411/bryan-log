"use client"

import { useState } from "react"
import { LayersIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { CategoryPanel, countCategories } from "@/components/admin/categories/category-panel"
import { DeleteSectionForm } from "@/components/admin/sections/delete-section-form"
import { SectionForm } from "@/components/admin/sections/section-form"
import { EmptyState } from "@/components/empty-state"
import { FormMessage } from "@/components/forms/form-message"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ACTION_STATUS } from "@/lib/actions/action-state"
import { CATEGORY_TYPE } from "@/lib/constants/content"
import type { AdminSectionCategoryGroup } from "@/lib/data/admin-categories"
import type { AdminSection } from "@/lib/data/sections"

type PostCategoryManagerProps = {
  groups: AdminSectionCategoryGroup[]
}

type SectionHeaderProps = {
  section: AdminSection
  onEdit: () => void
  onDelete: () => void
}

// 目前頁籤的區塊資訊與操作：名稱、前台網址、描述，以及編輯／刪除區塊
function SectionHeader({ section, onEdit, onDelete }: SectionHeaderProps) {
  const { name, slug, description, postCount } = section

  const maybeRenderDescription = () => {
    if (!description) return null
    return <p className="text-xs text-pretty text-muted-foreground">{description}</p>
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-muted/30 px-4 py-3">
      <div className="flex min-w-0 items-start gap-2.5">
        <LayersIcon className="mt-0.5 size-4 shrink-0 text-foreground/70" aria-hidden />
        <div className="grid min-w-0 gap-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="font-medium">{name}</span>
            <code className="rounded bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
              /{slug}
            </code>
            <span className="text-xs text-muted-foreground tabular-nums">
              {postCount > 0 ? `${postCount} 篇文章` : "尚無文章"}
            </span>
          </div>
          {maybeRenderDescription()}
        </div>
      </div>
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <PencilIcon aria-hidden />
          編輯區塊
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2Icon aria-hidden />
          刪除區塊
        </Button>
      </div>
    </div>
  )
}

// 文章分類：每個內容區塊一個頁籤，頁籤內先是區塊本身的設定，再來是該區塊的雙層分類
export function PostCategoryManager({ groups }: PostCategoryManagerProps) {
  const [selectedKey, setSelectedKey] = useState(groups[0]?.section.id ?? "")
  // 對話框內容與開關狀態分開保存：關閉動畫播放期間內容仍保留，不會閃成空白
  const [editingSection, setEditingSection] = useState<AdminSection | null>(null)
  const [isSectionFormOpen, setIsSectionFormOpen] = useState(false)
  // 每次開啟表單遞增，作為表單的 key，確保重新開啟時欄位與錯誤訊息都是乾淨的狀態
  const [sectionFormSession, setSectionFormSession] = useState(0)
  const [deletingSection, setDeletingSection] = useState<AdminSection | null>(null)
  const [isSectionDeleteOpen, setIsSectionDeleteOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  // 選取中的區塊被刪除後，退回第一個頁籤
  const activeKey = groups.some(({ section }) => section.id === selectedKey)
    ? selectedKey
    : (groups[0]?.section.id ?? "")

  const openSectionForm = (section: AdminSection | null) => {
    setNotice(null)
    setEditingSection(section)
    setSectionFormSession((session) => session + 1)
    setIsSectionFormOpen(true)
  }

  const openSectionDelete = (section: AdminSection) => {
    setNotice(null)
    setDeletingSection(section)
    setIsSectionDeleteOpen(true)
  }

  const handleSectionSaved = (message: string, sectionId?: string) => {
    setIsSectionFormOpen(false)
    setNotice(message)
    // 新增區塊後直接切到新頁籤，接著就能建立它的分類
    if (sectionId) setSelectedKey(sectionId)
  }

  const handleSectionDeleted = (message: string) => {
    setIsSectionDeleteOpen(false)
    setNotice(message)
  }

  const maybeRenderNotice = () => {
    if (!notice) return null
    return <FormMessage state={{ status: ACTION_STATUS.SUCCESS, message: notice }} />
  }

  const renderAddSectionButton = () => (
    <Button variant="outline" onClick={() => openSectionForm(null)}>
      <PlusIcon aria-hidden />
      新增區塊
    </Button>
  )

  const renderTabContent = ({ section, nodes }: AdminSectionCategoryGroup) => (
    <TabsContent key={section.id} value={section.id} className="grid gap-4">
      <SectionHeader
        section={section}
        onEdit={() => openSectionForm(section)}
        onDelete={() => openSectionDelete(section)}
      />
      <CategoryPanel
        type={CATEGORY_TYPE.POST}
        sectionId={section.id}
        scopeLabel={section.name}
        nodes={nodes}
        onSuccess={setNotice}
      />
    </TabsContent>
  )

  const maybeRenderTabs = () => {
    if (groups.length === 0) {
      return (
        <EmptyState
          icon={LayersIcon}
          title="尚未建立內容區塊"
          description="區塊是文章的大分類，例如「技術文章」、「旅遊心得」，每個區塊有自己的前台頁面與導覽項目。"
        >
          {renderAddSectionButton()}
        </EmptyState>
      )
    }

    return (
      <Tabs value={activeKey} onValueChange={setSelectedKey}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList aria-label="內容區塊" className="h-auto flex-wrap">
            {groups.map(({ section, nodes }) => (
              <TabsTrigger key={section.id} value={section.id}>
                {section.name}
                <span className="text-xs text-muted-foreground tabular-nums">
                  {countCategories(nodes)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          {renderAddSectionButton()}
        </div>
        <div className="mt-4">{groups.map(renderTabContent)}</div>
      </Tabs>
    )
  }

  const maybeRenderSectionDeleteContent = () => {
    if (!deletingSection) return null

    return (
      <>
        <DialogHeader>
          <DialogTitle>刪除區塊「{deletingSection.name}」？</DialogTitle>
        </DialogHeader>
        <DeleteSectionForm
          key={deletingSection.id}
          section={deletingSection}
          onSuccess={handleSectionDeleted}
        />
      </>
    )
  }

  return (
    <div className="grid gap-5">
      {maybeRenderNotice()}
      {maybeRenderTabs()}

      <Dialog open={isSectionFormOpen} onOpenChange={setIsSectionFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSection ? `編輯區塊「${editingSection.name}」` : "新增區塊"}
            </DialogTitle>
            <DialogDescription>
              文章的大分類，會出現在前台導覽列並有獨立的列表頁，例如「技術文章」、「旅遊心得」
            </DialogDescription>
          </DialogHeader>
          <SectionForm
            key={sectionFormSession}
            section={editingSection}
            onSuccess={handleSectionSaved}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isSectionDeleteOpen} onOpenChange={setIsSectionDeleteOpen}>
        <DialogContent className="max-w-md">{maybeRenderSectionDeleteContent()}</DialogContent>
      </Dialog>
    </div>
  )
}
