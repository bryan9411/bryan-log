import type { JSONContent } from "@tiptap/core"

import {
  CHECK_STATUS,
  outlineContent,
  type ContentCheck,
  type ContentOutline,
} from "@/lib/content/content-check"
import { TLDR_MAX_ITEMS } from "@/lib/validations/post"

// GEO（Generative Engine Optimization）：讓 ChatGPT、Perplexity、Google AI 摘要等生成式搜尋
// 更容易理解、擷取並引用文章。規則著重「可直接引用的答案」與「清楚的結構」
export type GeoCheckInput = {
  tldr: string[]
  content: JSONContent | null
  categoryId: string | null
}

const TLDR_RECOMMENDED_MIN = 2
const ANSWER_FIRST_LENGTH = { MIN: 40, MAX: 300 } as const
const MIN_EVIDENCE_NUMBERS = 2
const MIN_CONTENT_LENGTH = 300

// 讀者實際會問的問題或比較，最容易與 AI 搜尋的提問比對成功
const QUESTION_HEADING_PATTERN =
  /[?？]|如何|為什麼|為何|什麼|怎麼|哪些|是否|差別|比較|\bvs\.?\b|\bhow\b|\bwhy\b|\bwhat\b/i

function checkTldr(tldr: string[]): ContentCheck {
  const base = { id: "tldr", label: "TL;DR 核心速讀" }

  if (tldr.length === 0) {
    return {
      ...base,
      status: CHECK_STATUS.WARN,
      message: "尚未填寫；結論摘要是 AI 搜尋最常直接引用的段落",
    }
  }
  if (tldr.length > TLDR_MAX_ITEMS) {
    return { ...base, status: CHECK_STATUS.FAIL, message: `最多 ${TLDR_MAX_ITEMS} 點，請精簡重點` }
  }
  if (tldr.length < TLDR_RECOMMENDED_MIN) {
    return {
      ...base,
      status: CHECK_STATUS.WARN,
      message: `目前 1 點，建議 ${TLDR_RECOMMENDED_MIN}～${TLDR_MAX_ITEMS} 點涵蓋主要結論`,
    }
  }
  return { ...base, status: CHECK_STATUS.PASS, message: `${tldr.length} 點結論摘要` }
}

// 開門見山：第一段就回答主題，AI 擷取答案時通常取用開頭段落
function checkAnswerFirst({ firstBlockType, firstParagraphLength }: ContentOutline): ContentCheck {
  const base = { id: "answer-first", label: "開門見山" }

  if (firstBlockType === null) {
    return { ...base, status: CHECK_STATUS.WARN, message: "尚未撰寫內文" }
  }
  if (firstBlockType !== "paragraph") {
    return {
      ...base,
      status: CHECK_STATUS.WARN,
      message: "內文建議以段落開頭，先用 1～2 句直接回答文章主題",
    }
  }
  if (firstParagraphLength < ANSWER_FIRST_LENGTH.MIN) {
    return {
      ...base,
      status: CHECK_STATUS.WARN,
      message: `開頭段落僅 ${firstParagraphLength} 字，建議完整說明「是什麼、解決什麼問題」`,
    }
  }
  if (firstParagraphLength > ANSWER_FIRST_LENGTH.MAX) {
    return {
      ...base,
      status: CHECK_STATUS.WARN,
      message: `開頭段落 ${firstParagraphLength} 字偏長，建議 2～3 句內點出結論`,
    }
  }
  return { ...base, status: CHECK_STATUS.PASS, message: "開頭段落直接點出主題" }
}

function checkQuestionHeadings({ headings }: ContentOutline): ContentCheck {
  const base = { id: "question-headings", label: "問題導向小標" }

  if (headings.length === 0) {
    return {
      ...base,
      status: CHECK_STATUS.WARN,
      message: "沒有小標；以讀者會問的問題作為小標，AI 更容易比對到對應段落",
    }
  }

  const questionCount = headings.filter(({ text }) => QUESTION_HEADING_PATTERN.test(text)).length
  if (questionCount === 0) {
    return {
      ...base,
      status: CHECK_STATUS.WARN,
      message: "建議至少一個小標寫成問題或比較，例如「USING 與 WITH CHECK 的差別？」",
    }
  }
  return {
    ...base,
    status: CHECK_STATUS.PASS,
    message: `${questionCount} 個小標以問題或比較形式呈現`,
  }
}

function checkStructuredContent({ listCount, codeBlockCount }: ContentOutline): ContentCheck {
  const base = { id: "structured", label: "結構化內容" }

  if (listCount + codeBlockCount === 0) {
    return {
      ...base,
      status: CHECK_STATUS.WARN,
      message: "加入條列重點或程式碼範例，AI 更容易擷取步驟與要點",
    }
  }
  return {
    ...base,
    status: CHECK_STATUS.PASS,
    message: `${listCount} 個清單、${codeBlockCount} 個程式碼區塊`,
  }
}

// 具體數據與外部來源能提高可信度，生成式搜尋偏好引用有根據的內容
function checkEvidence({ linkCount, numberCount }: ContentOutline): ContentCheck {
  const base = { id: "evidence", label: "數據與引用來源" }

  if (linkCount === 0 && numberCount < MIN_EVIDENCE_NUMBERS) {
    return {
      ...base,
      status: CHECK_STATUS.WARN,
      message: "加入具體數據、版本號或外部參考連結，提高可信度與被引用機率",
    }
  }
  return {
    ...base,
    status: CHECK_STATUS.PASS,
    message: `${linkCount} 個連結、${numberCount} 處數據`,
  }
}

function checkCategory(categoryId: string | null): ContentCheck {
  const base = { id: "category", label: "主題分類" }

  if (!categoryId) {
    return {
      ...base,
      status: CHECK_STATUS.WARN,
      message: "未設定分類；結構化資料與 llms.txt 會無法標示文章主題",
    }
  }
  return { ...base, status: CHECK_STATUS.PASS, message: "已設定，會寫入結構化資料與 llms.txt" }
}

function checkDepth({ textLength }: ContentOutline): ContentCheck {
  const base = { id: "depth", label: "內容份量" }

  if (textLength < MIN_CONTENT_LENGTH) {
    return {
      ...base,
      status: CHECK_STATUS.WARN,
      message: `內文約 ${textLength} 字，內容偏短較少被 AI 引用，建議 ${MIN_CONTENT_LENGTH} 字以上`,
    }
  }
  return { ...base, status: CHECK_STATUS.PASS, message: `內文約 ${textLength} 字` }
}

export function runGeoChecks({ tldr, content, categoryId }: GeoCheckInput): ContentCheck[] {
  const outline = outlineContent(content)

  return [
    checkTldr(tldr),
    checkAnswerFirst(outline),
    checkQuestionHeadings(outline),
    checkStructuredContent(outline),
    checkEvidence(outline),
    checkCategory(categoryId),
    checkDepth(outline),
  ]
}
