import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "field-sizing-content min-h-24 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-base outline-none transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
