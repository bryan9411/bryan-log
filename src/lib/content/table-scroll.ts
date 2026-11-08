// 表格欄位多時在窄螢幕會超出內文寬度，由伺服器包一層可水平捲動的容器；
// 捲動區域需能以鍵盤聚焦，鍵盤使用者才能左右捲動

// 輸入為 sanitize-html 清理後的 HTML，標籤一定成對；schema 不允許巢狀表格，可安全以正則比對
const TABLE_PATTERN = /<table\b[^>]*>[\s\S]*?<\/table>/g

export function wrapScrollableTables(html: string) {
  return html.replace(
    TABLE_PATTERN,
    (table) =>
      `<div class="article-table-scroll" role="region" aria-label="表格，可水平捲動" tabindex="0">${table}</div>`,
  )
}
