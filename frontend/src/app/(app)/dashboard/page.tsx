"use client"

import useSWR from "swr"
import { Activity, Banknote, Boxes, CalendarPlus, ShoppingCart, Wrench } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiFetch } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { formatCurrency } from "@/lib/format"
import type { DashboardStats } from "@/lib/types"

const chartColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]

export default function DashboardPage() {
  const { data, error, isLoading } = useSWR<DashboardStats>("dashboard/", apiFetch)
  const inUse = Object.entries(data?.status_counts || {}).find(([name]) => name.toLowerCase() === "in use")?.[1] || 0
  const statusData = Object.entries(data?.status_counts || {}).map(([name, value]) => ({ name, value }))
  const stats = [
    { label: "Total assets", value: data?.total_assets ?? 0, note: "Tracked across all departments", icon: Boxes, tone: "bg-primary/10 text-primary" },
    { label: "In use", value: inUse, note: "Currently assigned and active", icon: Activity, tone: "bg-emerald-100 text-emerald-700" },
    { label: "Added this month", value: data?.assets_this_month ?? 0, note: "New inventory records", icon: CalendarPlus, tone: "bg-blue-100 text-blue-700" },
    { label: "Maintenance today", value: data?.maintenance_today ?? 0, note: "Open reports logged today", icon: Wrench, tone: "bg-amber-100 text-amber-700" },
    { label: "Items bought", value: data?.total_items_bought ?? 0, note: "Approved items on bought requisitions", icon: ShoppingCart, tone: "bg-violet-100 text-violet-700" },
    { label: "Value bought", value: formatCurrency(data?.total_value_bought ?? 0), note: "Approved procurement value", icon: Banknote, tone: "bg-teal-100 text-teal-700" },
  ]

  return (
    <>
      <PageHeader eyebrow="Command centre" title="Operations overview" description="A live view of inventory health, movement, and maintenance activity." />
      {error ? <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Dashboard data is unavailable. Confirm that the Django server is running.</div> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => <Card key={stat.label} className="border-border/70 shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">{stat.label}</p>{isLoading ? <Skeleton className="mt-3 h-9 w-16" /> : <p className="mt-2 font-mono text-3xl font-semibold tracking-tight">{typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}</p>}</div><span className={`grid size-10 place-items-center rounded-xl ${stat.tone}`}><stat.icon className="size-5" /></span></div><p className="mt-4 text-xs text-muted-foreground">{stat.note}</p></CardContent></Card>)}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card className="border-border/70 shadow-sm"><CardHeader><CardTitle className="text-base">Asset status</CardTitle></CardHeader><CardContent className="h-72">{isLoading ? <Skeleton className="h-full" /> : statusData.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3}>{statusData.map((item, index) => <Cell key={item.name} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <EmptyChart />}</CardContent></Card>
        <Card className="border-border/70 shadow-sm"><CardHeader><CardTitle className="text-base">Assets by category</CardTitle></CardHeader><CardContent className="h-72">{isLoading ? <Skeleton className="h-full" /> : data?.categories.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={data.categories} margin={{ left: -18, right: 4 }}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} /><YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} /><Tooltip cursor={{ fill: "var(--muted)" }} /><Bar dataKey="asset_count" fill="var(--chart-1)" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyChart />}</CardContent></Card>
      </div>
      <Card className="mt-4 overflow-hidden border-border/70 shadow-sm">
        <CardHeader className="border-b"><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
        <CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Asset</TableHead><TableHead>Action</TableHead><TableHead>User</TableHead><TableHead>Description</TableHead></TableRow></TableHeader><TableBody>{data?.recent_activity.map((item, index) => <TableRow key={`${item.timestamp}-${index}`}><TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(item.timestamp, true)}</TableCell><TableCell className="font-mono font-medium">{item.asset_id || "—"}</TableCell><TableCell><StatusBadge value={item.action.replaceAll("_", " ")} /></TableCell><TableCell>{item.user || "System"}</TableCell><TableCell className="max-w-md truncate text-muted-foreground">{item.description}</TableCell></TableRow>)}{!isLoading && !data?.recent_activity.length && <TableRow><TableCell colSpan={5} className="h-28 text-center text-muted-foreground">No activity recorded yet.</TableCell></TableRow>}</TableBody></Table></div></CardContent>
      </Card>
    </>
  )
}

function EmptyChart() {
  return <div className="grid h-full place-items-center text-sm text-muted-foreground">No chart data yet</div>
}

