import * as React from "react"

import { cn } from "@/lib/utils"

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "link"

const variants: Record<BadgeVariant, string> = {
  default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
  secondary: "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
  destructive: "bg-destructive/10 text-destructive [a]:hover:bg-destructive/20",
  outline: "border-border text-foreground [a]:hover:bg-muted",
  ghost: "hover:bg-muted hover:text-muted-foreground",
  link: "text-primary underline-offset-4 hover:underline",
}

export function badgeVariants({ variant = "default", className }: { variant?: BadgeVariant; className?: string } = {}) {
  return cn("inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 [&>svg]:size-3", variants[variant], className)
}

function Badge({ className, variant = "default", children, ...props }: React.ComponentProps<"span"> & { variant?: BadgeVariant }) {
  return <span data-slot="badge" data-variant={variant} className={badgeVariants({ variant, className })} {...props}>{children}</span>
}

export { Badge }
