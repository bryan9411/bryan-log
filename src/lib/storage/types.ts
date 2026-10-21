// 上傳 API 的回應格式，伺服器路由與瀏覽器端 hook 共用
export type UploadResponse = { url: string; path: string } | { error: string }
