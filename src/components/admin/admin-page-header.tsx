type AdminPageHeaderProps = {
  title: string
  description?: string
  actions?: React.ReactNode
}

export function AdminPageHeader({ title, description, actions }: AdminPageHeaderProps) {
  const maybeRenderDescription = () => {
    if (!description) return null
    return <p className="text-sm text-muted-foreground">{description}</p>
  }

  const maybeRenderActions = () => {
    if (!actions) return null
    return <div className="flex shrink-0 items-center gap-2">{actions}</div>
  }

  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {maybeRenderDescription()}
      </div>
      {maybeRenderActions()}
    </header>
  )
}
