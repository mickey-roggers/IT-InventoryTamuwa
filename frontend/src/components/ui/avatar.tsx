/* eslint-disable @next/next/no-img-element */
import * as React from "react"

import { cn } from "@/lib/utils"

type AvatarSize = "default" | "sm" | "lg"
const avatarSizes: Record<AvatarSize, string> = { default: "size-8", sm: "size-6", lg: "size-10" }

function Avatar({ className, size = "default", ...props }: React.ComponentProps<"div"> & { size?: AvatarSize }) {
  return <div data-slot="avatar" data-size={size} className={cn("relative flex shrink-0 overflow-hidden rounded-full border border-border select-none", avatarSizes[size], className)} {...props} />
}

function AvatarImage({ className, alt = "", ...props }: React.ComponentProps<"img">) {
  return <img data-slot="avatar-image" alt={alt} className={cn("aspect-square size-full rounded-full object-cover", className)} {...props} />
}

function AvatarFallback({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="avatar-fallback" className={cn("flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground", className)} {...props} />
}

function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="avatar-badge" className={cn("absolute right-0 bottom-0 z-10 inline-flex size-2.5 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background", className)} {...props} />
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="avatar-group" className={cn("flex -space-x-2 *:ring-2 *:ring-background", className)} {...props} />
}

function AvatarGroupCount({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="avatar-group-count" className={cn("relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-2 ring-background", className)} {...props} />
}

export { Avatar, AvatarImage, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarBadge }
