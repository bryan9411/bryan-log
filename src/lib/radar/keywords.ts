// 雷達共用的關鍵字比對：GitHub 分類、資安主題與後台關鍵字規則都用同一套規則，結果才會一致

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// 以「整個單字」比對，前後不能緊接英數字；名稱中的 - _ / 視為單字邊界，例如 react-agent 會命中 agent
// 關鍵字內的空白可對應任意數量的空白，例如 model context protocol
export function buildKeywordPattern(keywords: string[]) {
  const alternatives = keywords
    .map((keyword) => escapeRegExp(keyword.trim()).replace(/\s+/g, "\\s+"))
    .join("|")
  return new RegExp(`(?<![a-z0-9])(?:${alternatives})(?![a-z0-9])`, "i")
}

// 後台關鍵字一律去除頭尾空白、壓縮連續空白並轉小寫後儲存，避免大小寫不同的重複規則
export function normalizeKeyword(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase()
}

export function matchesKeyword(text: string, keyword: string) {
  return buildKeywordPattern([keyword]).test(text)
}
