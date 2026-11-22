// 資安情資頁底部的防護資源清單：只放標題、一句自己寫的說明與連結，不轉貼原文
// 連結與專案維護狀態於 2026-11-22 確認；之後若有專案停止維護，直接從這裡移除
export type SecurityResource = {
  title: string
  description: string
  href: string
}

export type SecurityResourceGroup = {
  label: string
  items: SecurityResource[]
}

export const SECURITY_RESOURCE_GROUPS: SecurityResourceGroup[] = [
  {
    label: "指南與標準",
    items: [
      {
        title: "OWASP Top 10",
        description: "Web 應用最常見的十大風險類型，安全檢查的起點。",
        href: "https://owasp.org/www-project-top-ten/",
      },
      {
        title: "OWASP Top 10 for LLM Applications",
        description: "OWASP GenAI Security Project 整理的 LLM 與 Agent 應用主要風險。",
        href: "https://genai.owasp.org/llm-top-10/",
      },
      {
        title: "OWASP ASVS",
        description: "可逐條對照的應用程式安全驗證標準，適合當作驗收清單。",
        href: "https://owasp.org/www-project-application-security-verification-standard/",
      },
      {
        title: "OWASP Cheat Sheet Series",
        description: "針對單一主題（驗證、Session、XSS 防護…）的實作重點速查。",
        href: "https://cheatsheetseries.owasp.org/",
      },
    ],
  },
  {
    label: "線上學習",
    items: [
      {
        title: "PortSwigger Web Security Academy",
        description: "免費的 Web 漏洞教材與可動手操作的練習靶場。",
        href: "https://portswigger.net/web-security",
      },
      {
        title: "Cloudflare Learning Center",
        description: "以淺白方式解說 DDoS、DNS、TLS 等網路與資安基礎概念。",
        href: "https://www.cloudflare.com/learning/",
      },
    ],
  },
  {
    label: "開源防禦工具",
    items: [
      {
        title: "OSV-Scanner",
        description: "掃描專案依賴是否含有已知漏洞，資料來自 OSV 資料庫。",
        href: "https://github.com/google/osv-scanner",
      },
      {
        title: "Trivy",
        description: "掃描容器映像、檔案系統與 IaC 設定中的漏洞與錯誤設定。",
        href: "https://github.com/aquasecurity/trivy",
      },
      {
        title: "Semgrep",
        description: "以規則比對原始碼的靜態分析工具，可自訂檢查規則。",
        href: "https://github.com/semgrep/semgrep",
      },
      {
        title: "Gitleaks",
        description: "找出 Git 歷史與程式碼中意外提交的密鑰與憑證。",
        href: "https://github.com/gitleaks/gitleaks",
      },
      {
        title: "ZAP（原 OWASP ZAP）",
        description: "對執行中的 Web 應用做動態掃描與手動測試的代理工具。",
        href: "https://www.zaproxy.org/",
      },
    ],
  },
]

// 頁面底部固定顯示的資料來源標示；NVD 的聲明文字為官方要求的原文，不可改寫
export const SECURITY_ATTRIBUTIONS = [
  {
    label: "CISA Known Exploited Vulnerabilities Catalog",
    href: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
    note: "實戰遭利用榜的漏洞清單、勒索軟體利用與修補期限",
  },
  {
    label: "EPSS（FIRST.org）",
    href: "https://www.first.org/epss/",
    note: "EPSS 遭利用機率與百分位，資料由 FIRST.org 提供",
  },
  {
    label: "GitHub Advisory Database",
    href: "https://github.com/advisories",
    note: "開發生態漏洞與惡意套件公告，以 CC BY 4.0 授權",
  },
  {
    label: "NVD",
    href: "https://nvd.nist.gov/",
    note: "CVSS 分數",
  },
] as const

export const NVD_NOTICE =
  "This product uses the NVD API but is not endorsed or certified by the NVD."
