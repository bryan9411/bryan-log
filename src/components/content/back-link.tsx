import Link from "next/link"
import type { Route } from "next"
import { ArrowLeftIcon } from "lucide-react"

type BackLinkProps = {
  href: Route
  label: string
}

export function BackLink({ href, label }: BackLinkProps) {
  return (
    <Link
      href={href}
      className="group/back flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeftIcon
        className="size-4 transition-transform group-hover/back:-translate-x-0.5"
        aria-hidden
      />
      {label}
    </Link>
  )
}
