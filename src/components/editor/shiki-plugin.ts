import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"
import type { HighlighterCore } from "shiki/core"

import { normalizeCodeLanguage, type CodeLanguage } from "@/lib/editor/languages"
import { isHighlightable, loadHighlighter, SHIKI_THEMES } from "@/lib/shiki/highlighter"

const CODE_BLOCK_NODE = "codeBlock"
const REFRESH_META = "shikiRefresh"
const MAX_CACHE_ENTRIES = 200

type TokenSpan = { from: number; to: number; style: string }

const shikiPluginKey = new PluginKey<DecorationSet>("shikiHighlight")

let activeHighlighter: HighlighterCore | null = null
const loadedLanguages = new Set<CodeLanguage>()

// 以「語言 + 程式碼」為鍵快取 token，輸入其他段落時不必重新解析未變動的程式碼區塊
const tokenCache = new Map<string, TokenSpan[]>()

function toStyle(htmlStyle: Record<string, string> | string | undefined) {
  if (!htmlStyle) return ""
  if (typeof htmlStyle === "string") return htmlStyle

  return Object.entries(htmlStyle)
    .map(([property, value]) => `${property}:${value}`)
    .join(";")
}

function tokenize(highlighter: HighlighterCore, code: string, language: CodeLanguage) {
  const cacheKey = `${language}\u0000${code}`
  const cached = tokenCache.get(cacheKey)
  if (cached) return cached

  const { tokens } = highlighter.codeToTokens(code, {
    lang: language,
    themes: SHIKI_THEMES,
    defaultColor: false,
  })

  const spans = tokens.flat().map((token) => ({
    from: token.offset,
    to: token.offset + token.content.length,
    style: toStyle(token.htmlStyle),
  }))

  if (tokenCache.size >= MAX_CACHE_ENTRIES) tokenCache.clear()
  tokenCache.set(cacheKey, spans)

  return spans
}

function collectLanguages(doc: ProseMirrorNode) {
  const languages = new Set<CodeLanguage>()

  doc.descendants((node) => {
    if (node.type.name !== CODE_BLOCK_NODE) return true
    languages.add(normalizeCodeLanguage(node.attrs.language))
    return false
  })

  return languages
}

function buildDecorations(doc: ProseMirrorNode) {
  const highlighter = activeHighlighter
  if (!highlighter) return DecorationSet.empty

  const decorations: Decoration[] = []

  doc.descendants((node, position) => {
    if (node.type.name !== CODE_BLOCK_NODE) return true

    const language = normalizeCodeLanguage(node.attrs.language)
    if (!isHighlightable(language) || !loadedLanguages.has(language)) return false

    const contentStart = position + 1

    tokenize(highlighter, node.textContent, language).forEach(({ from, to, style }) => {
      if (!style || from === to) return
      decorations.push(Decoration.inline(contentStart + from, contentStart + to, { style }))
    })

    return false
  })

  return DecorationSet.create(doc, decorations)
}

// 以 ProseMirror decoration 疊加 Shiki 配色，不修改文件內容，因此存檔的 JSON 保持乾淨
export function createShikiPlugin() {
  return new Plugin<DecorationSet>({
    key: shikiPluginKey,
    state: {
      init: (_, state) => buildDecorations(state.doc),
      apply: (transaction, decorationSet) => {
        if (transaction.docChanged || transaction.getMeta(REFRESH_META)) {
          return buildDecorations(transaction.doc)
        }
        return decorationSet.map(transaction.mapping, transaction.doc)
      },
    },
    props: {
      decorations: (state) => shikiPluginKey.getState(state),
    },
    view: (editorView) => {
      let isDestroyed = false

      const ensureLanguages = (doc: ProseMirrorNode) => {
        const missing = [...collectLanguages(doc)].filter(
          (language) => isHighlightable(language) && !loadedLanguages.has(language),
        )
        if (missing.length === 0) return

        loadHighlighter(missing).then((highlighter) => {
          activeHighlighter = highlighter
          missing.forEach((language) => loadedLanguages.add(language))

          if (isDestroyed) return
          editorView.dispatch(editorView.state.tr.setMeta(REFRESH_META, true))
        })
      }

      ensureLanguages(editorView.state.doc)

      return {
        update: (view, previousState) => {
          if (view.state.doc !== previousState.doc) ensureLanguages(view.state.doc)
        },
        destroy: () => {
          isDestroyed = true
        },
      }
    },
  })
}
