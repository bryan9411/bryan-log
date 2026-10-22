import "server-only"

import { addCodeBlockToolbar } from "@/lib/content/code-block"
import { highlightCodeBlocks } from "@/lib/content/highlight-html"
import { wrapZoomableImages } from "@/lib/content/image-lightbox"
import { sanitizeArticleHtml } from "@/lib/content/sanitize"

// 前台輸出文章／作品內文的共同流程，結果隨呼叫端的 "use cache" 快取保存，不會每次請求重算：
// 1. 先以 sanitize-html 清理資料庫內容（縱深防禦）
// 2. 為尚未高亮的程式碼區塊補上 Shiki 高亮（例如直接寫入資料庫的種子資料）；存檔時已高亮的區塊不受影響
// 3. 加上語言標籤、行號切換、複製與長程式碼折疊按鈕
// 4. 將圖片包進可開啟燈箱的按鈕；後三步的輸出皆由伺服器自行產生，內容可信
export async function prepareArticleHtml(rawHtml: string) {
  const highlighted = await highlightCodeBlocks(sanitizeArticleHtml(rawHtml))
  return wrapZoomableImages(addCodeBlockToolbar(highlighted))
}
