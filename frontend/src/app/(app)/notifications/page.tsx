"use client"

import Link from "next/link"
import useSWR from "swr"
import { AlertTriangle, Bell, CircleAlert, Info } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

type SystemAlert = { id: string; level: "danger" | "warning" | "info"; category: string; title: string; message: string; href: string; timestamp: string }
type AlertResponse = { count: number; counts: { danger: number; warning: number; info: number }; results: SystemAlert[] }

const styles = {
  danger: { icon: CircleAlert, wrap: "bg-destructive/10 text-destructive" },
  warning: { icon: AlertTriangle, wrap: "bg-amber-100 text-amber-700" },
  info: { icon: Info, wrap: "bg-blue-100 text-blue-700" },
}

export default function NotificationsPage() {
  const { data, isLoading } = useSWR<AlertResponse>("system-alerts/", apiFetch)
  const alerts = data?.results || []

  return <>
    <PageHeader eyebrow="Alerts hub" title="Notifications" description="Critical issues, stale requests, bought-item queues, long repairs, missing assets, and delayed projects." />
    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      {(["danger", "warning", "info"] as const).map((level) => <Card key={level}><CardContent className="flex items-center justify-between p-4"><span className="text-sm capitalize text-muted-foreground">{level}</span><span className="font-mono text-2xl font-semibold">{data?.counts[level] || 0}</span></CardContent></Card>)}
    </div>
    <Card className="overflow-hidden border-border/70 shadow-sm"><CardContent className="p-0">
      {isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, index) => <Skeleton className="h-20" key={index} />)}</div> : alerts.length ? <div className="divide-y">{alerts.map((item) => { const style = styles[item.level]; const Icon = style.icon; return <div key={item.id} className="flex gap-4 p-5"><span className={cn("mt-0.5 grid size-9 shrink-0 place-items-center rounded-full", style.wrap)}><Icon className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{item.title}</p><Badge variant="outline">{item.category}</Badge></div><p className="mt-1 text-sm leading-6 text-muted-foreground">{item.message}</p><p className="mt-2 font-mono text-[11px] text-muted-foreground">{formatDate(item.timestamp, true)}</p></div><Button asChild variant="outline" size="sm"><Link href={item.href}>Open</Link></Button></div>})}</div> : <div className="p-16 text-center"><Bell className="mx-auto size-8 text-muted-foreground/50" /><p className="mt-4 font-medium">You’re all caught up</p><p className="mt-1 text-sm text-muted-foreground">No system alerts need attention.</p></div>}
    </CardContent></Card>
  </>
}
