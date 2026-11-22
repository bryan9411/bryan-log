// CWE 中文類型標籤：資安榜單的漏洞類型一眼可讀；對照表沒有的直接顯示 CWE 編號
// 名稱以實務上常用的說法為主，完整定義見 MITRE CWE 頁面
export const CWE_LABELS: Record<string, string> = {
  "CWE-20": "輸入驗證不當",
  "CWE-22": "路徑穿越",
  "CWE-74": "注入",
  "CWE-77": "指令注入",
  "CWE-78": "作業系統指令注入",
  "CWE-79": "XSS 跨站腳本",
  "CWE-88": "參數注入",
  "CWE-89": "SQL 注入",
  "CWE-94": "程式碼注入",
  "CWE-95": "動態執行注入",
  "CWE-119": "記憶體緩衝區錯誤",
  "CWE-120": "緩衝區溢位",
  "CWE-121": "堆疊緩衝區溢位",
  "CWE-122": "堆積緩衝區溢位",
  "CWE-125": "記憶體越界讀取",
  "CWE-190": "整數溢位",
  "CWE-200": "敏感資訊外洩",
  "CWE-203": "可觀測差異資訊外洩",
  "CWE-252": "未檢查回傳值",
  "CWE-269": "權限管理不當",
  "CWE-276": "預設權限不當",
  "CWE-284": "存取控制不當",
  "CWE-285": "授權不當",
  "CWE-287": "身分驗證不當",
  "CWE-288": "替代路徑繞過驗證",
  "CWE-290": "偽冒繞過驗證",
  "CWE-306": "關鍵功能缺少驗證",
  "CWE-307": "缺少暴力破解防護",
  "CWE-312": "敏感資訊明文儲存",
  "CWE-319": "敏感資訊明文傳輸",
  "CWE-327": "使用有缺陷的加密演算法",
  "CWE-345": "資料真實性驗證不足",
  "CWE-347": "簽章驗證不當",
  "CWE-352": "CSRF 跨站請求偽造",
  "CWE-362": "競態條件",
  "CWE-400": "資源耗盡",
  "CWE-401": "記憶體洩漏",
  "CWE-416": "釋放後使用",
  "CWE-420": "未受保護的替代通道",
  "CWE-434": "危險檔案上傳",
  "CWE-444": "HTTP 請求走私",
  "CWE-476": "空指標解參考",
  "CWE-494": "下載程式碼未驗證完整性",
  "CWE-502": "不安全的反序列化",
  "CWE-506": "內嵌惡意程式碼",
  "CWE-522": "憑證保護不足",
  "CWE-601": "開放式重新導向",
  "CWE-611": "XXE 外部實體注入",
  "CWE-639": "IDOR 物件存取控制繞過",
  "CWE-668": "資源暴露於錯誤範圍",
  "CWE-693": "防護機制失效",
  "CWE-732": "關鍵資源權限設定不當",
  "CWE-755": "例外處理不當",
  "CWE-770": "資源配置未設上限",
  "CWE-787": "記憶體越界寫入",
  "CWE-798": "寫死的憑證",
  "CWE-822": "不受信任的指標解參考",
  "CWE-824": "使用未初始化的指標",
  "CWE-829": "引入不受信任的功能",
  "CWE-843": "型別混淆",
  "CWE-862": "缺少授權檢查",
  "CWE-863": "授權檢查錯誤",
  "CWE-912": "隱藏功能（後門）",
  "CWE-913": "動態程式碼資源控制不當",
  "CWE-917": "表達式語言注入",
  "CWE-918": "SSRF 伺服器端請求偽造",
  "CWE-1188": "不安全的預設值",
  "CWE-1321": "原型污染",
  "CWE-1333": "ReDoS 正規表示式阻斷服務",
  "CWE-1336": "樣板注入",
}

const CWE_ID_PATTERN = /^CWE-(\d+)$/

// 只保留 CWE-數字 格式，NVD 的 NVD-CWE-Other／NVD-CWE-noinfo 等占位值不顯示
export function isCweId(value: string) {
  return CWE_ID_PATTERN.test(value)
}

export function getCweLabel(cweId: string) {
  return CWE_LABELS[cweId] ?? cweId
}

export function getCweUrl(cweId: string) {
  const number = CWE_ID_PATTERN.exec(cweId)?.[1]
  return `https://cwe.mitre.org/data/definitions/${number ?? ""}.html`
}
