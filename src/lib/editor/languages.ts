export const PLAIN_TEXT_LANGUAGE = "plaintext"

export const CODE_LANGUAGES = [
  { id: "typescript", label: "TypeScript" },
  { id: "tsx", label: "TSX" },
  { id: "javascript", label: "JavaScript" },
  { id: "jsx", label: "JSX" },
  { id: "json", label: "JSON" },
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "bash", label: "Bash／終端機" },
  { id: "sql", label: "SQL" },
  { id: "yaml", label: "YAML" },
  { id: "dockerfile", label: "Dockerfile" },
  { id: "python", label: "Python" },
  { id: "go", label: "Go" },
  { id: "rust", label: "Rust" },
  { id: "markdown", label: "Markdown" },
  { id: PLAIN_TEXT_LANGUAGE, label: "純文字" },
] as const

export type CodeLanguage = (typeof CODE_LANGUAGES)[number]["id"]

export type HighlightableLanguage = Exclude<CodeLanguage, typeof PLAIN_TEXT_LANGUAGE>

export const DEFAULT_CODE_LANGUAGE: CodeLanguage = "typescript"

// 常見縮寫統一轉為正式名稱，讓種子資料與貼上的 Markdown（```ts）也能正確高亮
const LANGUAGE_ALIASES: Record<string, CodeLanguage> = {
  ts: "typescript",
  js: "javascript",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  yml: "yaml",
  md: "markdown",
  py: "python",
  text: PLAIN_TEXT_LANGUAGE,
  txt: PLAIN_TEXT_LANGUAGE,
}

const LANGUAGE_IDS = new Set<string>(CODE_LANGUAGES.map((language) => language.id))

export function normalizeCodeLanguage(value: unknown): CodeLanguage {
  if (typeof value !== "string" || !value) return PLAIN_TEXT_LANGUAGE

  const lowered = value.toLowerCase()
  if (LANGUAGE_IDS.has(lowered)) return lowered as CodeLanguage

  return LANGUAGE_ALIASES[lowered] ?? PLAIN_TEXT_LANGUAGE
}

export function getCodeLanguageLabel(language: CodeLanguage) {
  return CODE_LANGUAGES.find((item) => item.id === language)?.label ?? language
}
