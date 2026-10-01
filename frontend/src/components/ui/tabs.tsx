"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type TabsContextValue = { value: string; setValue: (value: string) => void; orientation: "horizontal" | "vertical" }
const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabs() {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error("Tabs components must be used inside Tabs")
  return context
}

type TabsProps = Omit<React.ComponentProps<"div">, "defaultValue" | "onChange"> & {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  orientation?: "horizontal" | "vertical"
}

function Tabs({ className, defaultValue = "", value: controlledValue, onValueChange, orientation = "horizontal", ...props }: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue)
  const value = controlledValue ?? internalValue
  const setValue = (next: string) => { if (controlledValue === undefined) setInternalValue(next); onValueChange?.(next) }
  return <TabsContext.Provider value={{ value, setValue, orientation }}><div data-slot="tabs" data-orientation={orientation} className={cn("flex gap-2", orientation === "horizontal" ? "flex-col" : "flex-row", className)} {...props} /></TabsContext.Provider>
}

type TabsListVariant = "default" | "line"
const listStyles: Record<TabsListVariant, string> = { default: "bg-muted", line: "gap-1 bg-transparent rounded-none" }

function tabsListVariants({ variant = "default", className }: { variant?: TabsListVariant; className?: string } = {}) {
  return cn("inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground", listStyles[variant], className)
}

function TabsList({ className, variant = "default", ...props }: React.ComponentProps<"div"> & { variant?: TabsListVariant }) {
  const { orientation } = useTabs()
  return <div role="tablist" aria-orientation={orientation} data-slot="tabs-list" data-variant={variant} className={cn(tabsListVariants({ variant }), orientation === "vertical" && "h-fit flex-col", className)} {...props} />
}

function TabsTrigger({ className, value, onClick, ...props }: Omit<React.ComponentProps<"button">, "value"> & { value: string }) {
  const tabs = useTabs()
  const active = tabs.value === value
  return <button type="button" role="tab" aria-selected={active} data-active={active || undefined} data-slot="tabs-trigger" className={cn("relative inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4", active && "border-input bg-background text-foreground shadow-sm", className)} onClick={(event) => { tabs.setValue(value); onClick?.(event) }} {...props} />
}

function TabsContent({ className, value, ...props }: Omit<React.ComponentProps<"div">, "value"> & { value: string }) {
  const tabs = useTabs()
  if (tabs.value !== value) return null
  return <div role="tabpanel" data-slot="tabs-content" className={cn("flex-1 text-sm outline-none", className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
