"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import useSWR from "swr"
import {
  Bell,
  BarChart3,
  Boxes,
  Building2,
  ClipboardCheck,
  FolderKanban,
  Gauge,
  HardHat,
  History,
  Link2,
  LogOut,
  Menu,
  PackageSearch,
  ShoppingCart,
  Settings,
  ShieldCheck,
  TicketCheck,
  UserCog,
  UserRound,
  Users,
  Wrench,
  X,
  XCircle,
} from "lucide-react"

import { useAuth } from "@/components/providers/auth-provider"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

type NavigationItem = { href: string; label: string; icon: typeof Gauge; adminOnly?: boolean; external?: boolean }

const navigation: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/assets", label: "Assets", icon: Boxes },
  { href: "/asset-links", label: "Asset Links", icon: Link2 },
  { href: "/quantities", label: "Quantities", icon: BarChart3 },
  { href: "/requisitions", label: "Requisitions", icon: ClipboardCheck },
  { href: "/requisitions/unapproved", label: "Not Approved Items", icon: XCircle },
  { href: "/requisitions/bought-queue", label: "Bought Items Queue", icon: ShoppingCart },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/issues", label: "Issues", icon: TicketCheck },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tasks", label: "Tasks", icon: PackageSearch },
  { href: "/technicians", label: "Technicians", icon: HardHat },
  { href: "/directory", label: "People & Depts", icon: Users },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/users", label: "User Management", icon: UserCog, adminOnly: true },
  { href: `${process.env.NEXT_PUBLIC_DJANGO_URL || "https://ict-inventory.up.railway.app"}/admin/`, label: "Admin Panel", icon: Settings, adminOnly: true, external: true },
  { href: "/activity", label: "Activity", icon: History },
]

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-3 px-2">
      <span className="grid size-10 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-black/15">
        <ShieldCheck className="size-5" />
      </span>
      <span>
        <span className="block text-sm font-semibold tracking-tight text-white">Tamuwa ICT</span>
        <span className="block text-xs text-sidebar-foreground/55">Inventory workspace</span>
      </span>
    </Link>
  )
}

function Navigation({ close }: { close?: () => void }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const isAdmin = Boolean(user?.is_staff || user?.is_superuser || user?.profile?.role === "admin" || user?.profile?.role === "super_admin")
  const visibleNavigation = navigation.filter((item) => !item.adminOnly || isAdmin)
  const activeHref = visibleNavigation.reduce<string | undefined>((match, item) => {
    if (pathname !== item.href && !pathname.startsWith(`${item.href}/`)) return match
    return !match || item.href.length > match.length ? item.href : match
  }, undefined)
  return (
    <nav className="mt-8 space-y-1">
      {visibleNavigation.map((item) => {
        const active = activeHref === item.href
        if (item.external) return <a key={item.href} href={item.href} target="_blank" rel="noreferrer" onClick={close} className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"><item.icon className="size-4" />{item.label}</a>
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={close}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <item.icon className={cn("size-4", active && "text-sidebar-primary")} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 overflow-y-auto border-r border-sidebar-border bg-sidebar px-4 py-5 lg:block">
      <Brand />
      <Navigation />
      <div className="mt-6 rounded-xl border border-sidebar-border bg-white/5 p-3">
        <p className="text-xs font-medium text-sidebar-foreground">System status</p>
        <p className="mt-1 flex items-center gap-2 text-xs text-sidebar-foreground/55">
          <span className="size-1.5 rounded-full bg-emerald-400" /> API connected
        </p>
      </div>
    </aside>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const isAdmin = Boolean(user?.is_staff || user?.is_superuser || user?.profile?.role === "admin" || user?.profile?.role === "super_admin")
  const { data: notifications } = useSWR<{ count: number }>("system-alerts/", apiFetch)
  const unread = notifications?.count || 0
  const initials = `${user?.first_name?.[0] ?? ""}${user?.last_name?.[0] ?? user?.username?.[0] ?? "U"}`.toUpperCase()

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu /></Button>
            {mobileNavOpen && <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
              <button className="absolute inset-0 bg-black/35 backdrop-blur-sm" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />
              <aside className="absolute inset-y-0 left-0 w-72 overflow-y-auto border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground shadow-2xl">
                <Button variant="ghost" size="icon-sm" className="absolute right-3 top-3 text-sidebar-foreground" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}><X /></Button>
                <Brand />
                <Navigation close={() => setMobileNavOpen(false)} />
              </aside>
            </div>}
            <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><Building2 className="size-3.5" />{user?.profile?.department || "All departments"}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Link href="/notifications"><Bell />{unread > 0 && <Badge className="absolute -right-1 -top-1 h-4 min-w-4 px-1 text-[9px]">{unread}</Badge>}</Link>
            </Button>
            <details className="group relative">
              <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg px-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
                <Avatar className="size-7"><AvatarFallback className="bg-primary text-xs text-primary-foreground">{initials}</AvatarFallback></Avatar>
                <span className="hidden max-w-32 truncate sm:inline">{user?.first_name || user?.username || "Account"}</span>
              </summary>
              <div className="absolute right-0 z-50 mt-1 w-56 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl">
                <div className="px-2 py-1.5 text-xs font-medium"><span className="block truncate">{user?.username}</span><span className="block truncate font-normal text-muted-foreground">{user?.email || "No email set"}</span></div>
                <div className="-mx-1 my-1 h-px bg-border" />
                <Link href="/profile" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent focus:bg-accent focus:outline-none"><UserRound className="size-4" /> Profile</Link>
                {isAdmin && <Link href="/users" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent focus:bg-accent focus:outline-none"><UserCog className="size-4" /> User management</Link>}
                <div className="-mx-1 my-1 h-px bg-border" />
                <button type="button" onClick={logout} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:outline-none"><LogOut className="size-4" /> Sign out</button>
              </div>
            </details>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}

