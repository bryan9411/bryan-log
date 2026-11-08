import { THEME } from "@/lib/constants/theme"

export type DemoTheme = typeof THEME.LIGHT | typeof THEME.DARK

// iframe 與部落格之間只透過 postMessage 溝通；此標記用來和 Demo 自身的訊息區分
export const DEMO_MESSAGE_SOURCE = "bryan-log-demo"

export const DEMO_MESSAGE = {
  READY: "ready",
  HEIGHT: "height",
  THEME: "theme",
} as const

// Demo 不載入外部資源：只允許行內樣式與腳本，以及 data:／blob: 的圖片、字型和媒體
const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  "font-src data:",
  "media-src data: blob:",
  "form-action 'none'",
  "base-uri 'none'",
].join("; ")

// iframe 與上層頁面的 color-scheme 不一致時，瀏覽器會把 iframe 畫成不透明底色，必須隨主題同步
const BASE_STYLE = [
  "html { color-scheme: light; }",
  `html[data-theme="${THEME.DARK}"] { color-scheme: dark; }`,
  "body { margin: 0; font-family: system-ui, sans-serif; }",
].join(" ")

// 以 IIFE 執行，不留下全域變數，避免與 Demo 的 id 全域參照或變數衝突。
// 不使用 documentElement.scrollHeight：它不會小於 iframe 視窗，內容變矮時無法縮回
const BOOTSTRAP_SCRIPT = `(function () {
  var source = ${JSON.stringify(DEMO_MESSAGE_SOURCE)};
  var root = document.documentElement;
  var lastHeight = -1;

  function send(message) {
    message.source = source;
    parent.postMessage(message, "*");
  }

  function measure() {
    var body = document.body;
    var height = root.getBoundingClientRect().height;
    if (body) height = Math.max(height, body.scrollHeight);
    height = Math.ceil(height);
    if (height === lastHeight) return;
    lastHeight = height;
    send({ type: ${JSON.stringify(DEMO_MESSAGE.HEIGHT)}, height: height });
  }

  addEventListener("message", function (event) {
    var data = event.data;
    if (event.source !== parent || !data || data.source !== source) return;
    if (data.type !== ${JSON.stringify(DEMO_MESSAGE.THEME)}) return;
    if (data.theme === ${JSON.stringify(THEME.LIGHT)} || data.theme === ${JSON.stringify(THEME.DARK)}) {
      root.setAttribute("data-theme", data.theme);
    }
  });

  var observer = new ResizeObserver(measure);
  observer.observe(root);
  document.addEventListener("DOMContentLoaded", function () {
    observer.observe(document.body);
    measure();
  });
  addEventListener("load", measure);
  send({ type: ${JSON.stringify(DEMO_MESSAGE.READY)} });
})();`

// 組成 iframe 的完整文件。CSP 與啟動腳本都位於 Demo 內容之前：CSP 一經套用，Demo 只能再收緊、無法放寬
export function buildDemoDocument(body: string, theme: DemoTheme) {
  return [
    "<!doctype html>",
    `<html lang="zh-Hant" data-theme="${theme}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}">`,
    `<style>${BASE_STYLE}</style>`,
    `<script>${BOOTSTRAP_SCRIPT}</script>`,
    "</head>",
    `<body>${body}</body>`,
    "</html>",
  ].join("\n")
}
