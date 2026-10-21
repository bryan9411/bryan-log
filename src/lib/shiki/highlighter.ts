import { createHighlighterCore, type HighlighterCore, type LanguageInput } from "shiki/core"
import { createJavaScriptRegexEngine } from "shiki/engine/javascript"

import {
  PLAIN_TEXT_LANGUAGE,
  type CodeLanguage,
  type HighlightableLanguage,
} from "@/lib/editor/languages"

// 伺服器（存檔時預先高亮）與瀏覽器（編輯器即時高亮）共用同一份設定，確保兩邊配色一致
export const SHIKI_THEMES = {
  light: "github-light",
  dark: "github-dark",
} as const

// 逐一列出動態載入點：打包工具只會為這些語言切出獨立 chunk，未使用的語言不會被下載
const LANGUAGE_LOADERS: Record<HighlightableLanguage, () => LanguageInput> = {
  typescript: () => import("shiki/langs/typescript.mjs"),
  tsx: () => import("shiki/langs/tsx.mjs"),
  javascript: () => import("shiki/langs/javascript.mjs"),
  jsx: () => import("shiki/langs/jsx.mjs"),
  json: () => import("shiki/langs/json.mjs"),
  html: () => import("shiki/langs/html.mjs"),
  css: () => import("shiki/langs/css.mjs"),
  bash: () => import("shiki/langs/bash.mjs"),
  sql: () => import("shiki/langs/sql.mjs"),
  yaml: () => import("shiki/langs/yaml.mjs"),
  dockerfile: () => import("shiki/langs/dockerfile.mjs"),
  python: () => import("shiki/langs/python.mjs"),
  go: () => import("shiki/langs/go.mjs"),
  rust: () => import("shiki/langs/rust.mjs"),
  markdown: () => import("shiki/langs/markdown.mjs"),
}

let highlighterPromise: Promise<HighlighterCore> | null = null
const languageLoads = new Map<HighlightableLanguage, Promise<void>>()

// 使用純 JavaScript 正規表示式引擎，免載入 WebAssembly，瀏覽器端體積更小
function getHighlighter() {
  highlighterPromise ??= createHighlighterCore({
    themes: [import("shiki/themes/github-light.mjs"), import("shiki/themes/github-dark.mjs")],
    langs: [],
    engine: createJavaScriptRegexEngine(),
  })

  return highlighterPromise
}

export function isHighlightable(language: CodeLanguage): language is HighlightableLanguage {
  return language !== PLAIN_TEXT_LANGUAGE
}

export async function loadHighlighter(languages: CodeLanguage[]) {
  const highlighter = await getHighlighter()

  await Promise.all(
    languages.filter(isHighlightable).map((language) => {
      let load = languageLoads.get(language)

      if (!load) {
        load = highlighter.loadLanguage(LANGUAGE_LOADERS[language]())
        languageLoads.set(language, load)
      }

      return load
    }),
  )

  return highlighter
}
