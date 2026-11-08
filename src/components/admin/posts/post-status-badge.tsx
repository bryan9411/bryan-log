import { Badge } from "@/components/ui/badge"
import { CONTENT_STATUS, CONTENT_STATUS_LABEL, type ContentStatus } from "@/lib/constants/content"

const STATUS_VARIANT = {
  [CONTENT_STATUS.PUBLISHED]: "default",
  [CONTENT_STATUS.DRAFT]: "outline",
} as const satisfies Record<ContentStatus, React.ComponentProps<typeof Badge>["variant"]>

type PostStatusBadgeProps = {
  status: ContentStatus
  isScheduled?: boolean
}

export function PostStatusBadge({ status, isScheduled = false }: PostStatusBadgeProps) {
  if (isScheduled) return <Badge variant="secondary">已排程</Badge>

  return <Badge variant={STATUS_VARIANT[status]}>{CONTENT_STATUS_LABEL[status]}</Badge>
}
