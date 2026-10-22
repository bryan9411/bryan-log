import "server-only"

// 部署平台的反向代理會寫入 x-forwarded-for，第一個位址為實際用戶端；無法辨識時回傳 null
export function getClientIp(requestHeaders: Headers) {
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwardedFor || requestHeaders.get("x-real-ip")?.trim() || null
}
