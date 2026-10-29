import {
  getCodeLanguageLabel,
  normalizeCodeLanguage,
  PLAIN_TEXT_LANGUAGE,
} from "@/lib/editor/languages"
import { decodeHtmlEntities } from "@/lib/content/html-entities"
import { CODE_LANGUAGE_CLASS_PREFIX } from "@/lib/editor/extensions"
import { isHighlightable, loadHighlighter, SHIKI_THEMES } from "@/lib/shiki/highlighter"

// 輸入為 sanitize-html 序列化後的 HTML：程式碼內容已轉義，不可能出現未轉義的 </code>，因此可安全以正則比對。
// 純文字區塊存檔時不經 Shiki、仍是 <pre><code>，前台再跑一次時需辨認出外層已有 .code-block 容器並跳過，否則會重複包裝
const CODE_BLOCK_PATTERN = new RegExp(
  `(<div class="code-block"[^>]*>)?<pre><code(?: class="${CODE_LANGUAGE_CLASS_PREFIX}([\\w-]+)")?>([\\s\\S]*?)</code></pre>`,
  "g",
)

function wrapCodeBlock(language: string, label: string, inner: string) {
  return `<div class="code-block" data-language="${language}" data-language-label="${label}">${inner}</div>`
}

// 存檔時在伺服器端預先完成語法高亮，前台直接輸出 HTML，不需在瀏覽器載入 Shiki
export async function highlightCodeBlocks(html: string) {
  const matches = [...html.matchAll(CODE_BLOCK_PATTERN)]
  if (matches.length === 0) return html

  const languages = matches.map((match) => normalizeCodeLanguage(match[2]))
  const highlighter = await loadHighlighter(languages)

  let index = 0

  return html.replace(
    CODE_BLOCK_PATTERN,
    (original, wrapper: string | undefined, _rawLanguage, escapedCode: string) => {
      const language = languages[index++]
      if (wrapper) return original

      const label = getCodeLanguageLabel(language)

      if (!isHighlightable(language)) {
        return wrapCodeBlock(PLAIN_TEXT_LANGUAGE, label, original)
      }

      const highlighted = highlighter.codeToHtml(decodeHtmlEntities(escapedCode), {
        lang: language,
        themes: SHIKI_THEMES,
        defaultColor: false,
      })

      return wrapCodeBlock(language, label, highlighted)
    },
  )
}
