import type { ComponentProps } from "react"

type ExternalLinkProps = Omit<ComponentProps<"a">, "target" | "rel">

// 所有外部連結統一由此輸出，強制另開分頁並阻斷 window.opener 與 Referer 外洩
export function ExternalLink({ children, ...props }: ExternalLinkProps) {
  return (
    <a target="_blank" rel="noopener noreferrer" {...props}>
      {children}
      <span className="sr-only">（另開新分頁）</span>
    </a>
  )
}
