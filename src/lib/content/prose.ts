// 編輯器與前台內文共用同一套排版，確保「所見即所得」
// Typography 預設會在行內程式碼前後加上反引號，改以淡色底塊呈現；程式碼區塊內的 code 需排除底塊樣式
export const PROSE_CLASS =
  "prose max-w-none prose-zinc dark:prose-invert prose-headings:scroll-mt-24 prose-headings:tracking-tight prose-a:underline-offset-4 prose-img:rounded-xl prose-img:border prose-code:rounded-md prose-code:bg-foreground/[0.06] prose-code:px-1.5 prose-code:py-0.5 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none [&_pre_code]:rounded-none [&_pre_code]:bg-transparent [&_pre_code]:p-0"
