import type { ReactNode } from "react"

export function PageHeader({ title, description, eyebrow, actions }: { title: string; description: string; eyebrow?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow && <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-primary">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

