import { ExternalLink } from "@/components/site/external-link"
import { cn } from "@/lib/utils"

type RadarItemTitleProps = {
  title: string
  url: string
  subtitle?: string | null
  mono?: boolean
}

export function RadarItemTitle({ title, url, subtitle, mono = false }: RadarItemTitleProps) {
  return (
    <div className="min-w-0">
      <ExternalLink
        href={url}
        className={cn("block truncate font-medium hover:underline", mono && "font-mono")}
        title={title}
      >
        {title}
      </ExternalLink>
      {subtitle ? (
        <span className="mt-0.5 block truncate text-xs text-muted-foreground" title={subtitle}>
          {subtitle}
        </span>
      ) : null}
    </div>
  )
}
