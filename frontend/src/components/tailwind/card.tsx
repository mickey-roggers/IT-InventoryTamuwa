import * as React from "react"
import { cn } from "@/lib/utils"

function hasPaddingClass(className?: string) {
  return /(?:^|\s)p(?:[trblxy])?-/.test(className || "")
}

function Card({
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "w-full min-w-0 rounded-2xl bg-card text-sm text-card-foreground ring-1 ring-border/80",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("grid min-w-0 auto-rows-min items-start gap-1", !hasPaddingClass(className) && "px-5 pb-3 pt-5", className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("font-heading text-base font-semibold leading-snug tracking-tight", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("min-w-0", !hasPaddingClass(className) && "px-5 pb-5", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center rounded-b-2xl border-t bg-muted/40 px-5 py-4",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
