export type CategoryRef = {
  name: string
  slug: string
}

export type CategoryOption = CategoryRef & {
  id: string
}

export type CategoryTreeNode = CategoryOption & {
  children: CategoryOption[]
}

export type CategorySelection = {
  parent: CategoryTreeNode | null
  child: CategoryOption | null
}

export type CategorizedItem = {
  category: CategoryRef | null
  parentCategory: CategoryRef | null
}

// 網址查詢參數名稱：/posts?category=frontend
export const CATEGORY_SEARCH_PARAM = "category"

// 選取父分類時涵蓋其下所有子分類的內容，選取子分類時只比對該子分類
export function matchesCategory(item: CategorizedItem, slug: string) {
  return item.category?.slug === slug || item.parentCategory?.slug === slug
}

export function formatCategoryPath({ category, parentCategory }: CategorizedItem) {
  if (!category) return null
  return parentCategory ? `${parentCategory.name} / ${category.name}` : category.name
}

// 由網址上的單一 slug 反推父／子分類；找不到時視為「全部」
export function resolveCategorySelection(
  tree: CategoryTreeNode[],
  slug: string | null,
): CategorySelection {
  if (slug) {
    for (const parent of tree) {
      if (parent.slug === slug) return { parent, child: null }

      const child = parent.children.find((option) => option.slug === slug)
      if (child) return { parent, child }
    }
  }

  return { parent: null, child: null }
}

// 每個分類底下的內容數量；父分類同時累計其子分類的內容
export function countByCategory(items: readonly CategorizedItem[]) {
  const counts = new Map<string, number>()
  const increment = (slug: string) => counts.set(slug, (counts.get(slug) ?? 0) + 1)

  items.forEach(({ category, parentCategory }) => {
    if (category) increment(category.slug)
    if (parentCategory) increment(parentCategory.slug)
  })

  return counts
}
