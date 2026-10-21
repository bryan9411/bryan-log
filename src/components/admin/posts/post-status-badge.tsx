import { Badge } from "@/components/ui/badge"
import { CONTENT_STATUS, CONTENT_STATUS_LABEL, type ContentStatus } from "@/lib/constants/content"

const STATUS_VARIANT = {
  [CONTENT_STATUS.PUBLISHED]: "default",
  [CONTENT_STATUS.DRAFT]: "outline",
} as const satisfies Record<ContentStatus, React.ComponentProps<typeof Badge>["variant"]>

export function PostStatusBadge({ status }: { status: ContentStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{CONTENT_STATUS_LABEL[status]}</Badge>
}
