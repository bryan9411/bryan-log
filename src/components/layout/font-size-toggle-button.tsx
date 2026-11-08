import { ALargeSmallIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export function FontSizeToggleButton(props: React.ComponentProps<typeof Button>) {
  return (
    <Button variant="ghost" size="icon" aria-label="調整文字大小" title="調整文字大小" {...props}>
      <ALargeSmallIcon />
    </Button>
  )
}
