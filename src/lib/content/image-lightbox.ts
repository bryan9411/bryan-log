// 文章圖片燈箱：伺服器把每張圖片包進按鈕，讓滑鼠、鍵盤與螢幕閱讀器都能開啟放大檢視；
// 客戶端只以事件委派監聽，不需為每張圖片掛載 React 元件
export const LIGHTBOX_TRIGGER_ATTR = "data-lightbox-trigger"
export const LIGHTBOX_TRIGGER_SELECTOR = `[${LIGHTBOX_TRIGGER_ATTR}]`

// 輸入為 sanitize-html 清理後的 HTML，屬性值一律以雙引號包住且已轉義，可安全以正則比對與重用。
// 已經被連結包住的圖片維持原本的連結行為，不再包一層按鈕（按鈕不可巢狀於連結內）
const ANCHOR_OR_IMAGE_PATTERN = /(<a\b[\s\S]*?<\/a>)|(<img\b[^>]*>)/g
const ALT_ATTR_PATTERN = /\balt="([^"]*)"/

export function wrapZoomableImages(html: string) {
  return html.replace(ANCHOR_OR_IMAGE_PATTERN, (match, anchor: string | undefined) => {
    if (anchor) return match

    const alt = match.match(ALT_ATTR_PATTERN)?.[1]
    const label = alt ? `放大檢視圖片：${alt}` : "放大檢視圖片"

    return `<button type="button" class="article-image-zoom" ${LIGHTBOX_TRIGGER_ATTR} aria-haspopup="dialog" aria-label="${label}">${match}</button>`
  })
}
