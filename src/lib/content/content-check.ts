import type { JSONContent } from "@tiptap/core"

// SEO 與 GEO 健檢共用的結果格式
export const CHECK_STATUS = {
  PASS: "pass",
  WARN: "warn",
  FAIL: "fail",
} as const

export type CheckStatus = (typeof CHECK_STATUS)[keyof typeof CHECK_STATUS]

export const CHECK_STATUS_LABEL: Record<CheckStatus, string> = {
  [CHECK_STATUS.PASS]: "通過",
  [CHECK_STATUS.WARN]: "建議改善",
  [CHECK_STATUS.FAIL]: "需修正",
}

export type ContentCheck = {
  id: string
  label: string
  status: CheckStatus
  message: string
}

export type ContentOutline = {
  headings: Array<{ level: number; text: string }>
  // 純文字字數（不含程式碼區塊）
  textLength: number
  firstBlockType: string | null
  firstParagraphLength: number
  listCount: number
  codeBlockCount: number
  linkCount: number
  numberCount: number
}

const NUMBER_PATTERN = /\d+(?:[.,]\d+)?\s*(?:%|ms|秒|倍|KB|MB|GB|年|個|次|行)?/g

const textOf = (node: JSONContent): string =>
  node.type === "text" ? (node.text ?? "") : (node.content ?? []).map(textOf).join("")

// 一次走訪編輯器 JSON，取出 SEO 與 GEO 規則需要的結構資訊
export function outlineContent(content: JSONContent | null): ContentOutline {
  const outline: ContentOutline = {
    headings: [],
    textLength: 0,
    firstBlockType: content?.content?.[0]?.type ?? null,
    firstParagraphLength: 0,
    listCount: 0,
    codeBlockCount: 0,
    linkCount: 0,
    numberCount: 0,
  }

  const firstParagraph = content?.content?.find((node) => node.type === "paragraph")
  if (firstParagraph) outline.firstParagraphLength = textOf(firstParagraph).trim().length

  const visit = (node: JSONContent) => {
    switch (node.type) {
      case "heading":
        if (typeof node.attrs?.level === "number") {
          outline.headings.push({ level: node.attrs.level, text: textOf(node).trim() })
        }
        break
      case "bulletList":
      case "orderedList":
        outline.listCount += 1
        break
      case "codeBlock":
        outline.codeBlockCount += 1
        // 程式碼不計入文字量與數據統計
        return
      case "text":
        outline.textLength += node.text?.length ?? 0
        outline.numberCount += node.text?.match(NUMBER_PATTERN)?.length ?? 0
        if (node.marks?.some((mark) => mark.type === "link")) outline.linkCount += 1
        return
    }
    node.content?.forEach(visit)
  }

  if (content) visit(content)
  return outline
}
