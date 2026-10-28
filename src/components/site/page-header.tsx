type PageHeaderProps = {
  title: string
  description?: string | null
}

export function PageHeader({ title, description }: PageHeaderProps) {
  const maybeRenderDescription = () => {
    if (!description) return null
    return (
      <p className="max-w-2xl leading-relaxed text-pretty text-muted-foreground">{description}</p>
    )
  }

  return (
    <header className="flex flex-col gap-3">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      {maybeRenderDescription()}
    </header>
  )
}
