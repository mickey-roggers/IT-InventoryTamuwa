"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import useSWR from "swr"
import { ArrowLeft, Calendar, CircleDollarSign, Cpu, Hash, MapPin, UserRound } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/lib/api"
import { formatCurrency, formatDate } from "@/lib/format"
import type { Asset } from "@/lib/types"

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: asset, error, isLoading } = useSWR<Asset>(`assets/${id}/`, apiFetch)
  if (isLoading) return <Skeleton className="h-[32rem] w-full" />
  if (error || !asset) return <div className="rounded-xl border bg-card p-12 text-center"><p className="font-semibold">Asset not found</p><Button asChild variant="outline" className="mt-4"><Link href="/assets">Back to assets</Link></Button></div>

  const facts = [
    { label: "Category", value: asset.category.name, icon: Cpu },
    { label: "Serial number", value: asset.serial_number, icon: Hash },
    { label: "Assigned to", value: asset.assigned_to?.full_name || "Unassigned", icon: UserRound },
    { label: "Department", value: asset.department?.name || "No department", icon: MapPin },
    { label: "Purchase date", value: formatDate(asset.purchase_date), icon: Calendar },
    { label: "Purchase cost", value: formatCurrency(asset.purchase_cost), icon: CircleDollarSign },
  ]

  return <><Button asChild variant="ghost" className="mb-4 -ml-2"><Link href="/assets"><ArrowLeft />Back to assets</Link></Button><PageHeader eyebrow="Asset record" title={asset.asset_id} description={asset.model_description} actions={<StatusBadge value={asset.status.name} className="px-3 py-1" />} /><div className="grid gap-4 lg:grid-cols-[1.4fr_.6fr]"><Card className="border-border/70 shadow-sm"><CardHeader><CardTitle className="text-base">Asset details</CardTitle></CardHeader><CardContent><div className="grid gap-6 sm:grid-cols-2">{facts.map((fact) => <div key={fact.label} className="flex gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><fact.icon className="size-4" /></span><div><p className="text-xs text-muted-foreground">{fact.label}</p><p className="mt-1 text-sm font-medium">{fact.value}</p></div></div>)}</div><Separator className="my-6" /><div><p className="text-xs text-muted-foreground">Administrative notes</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{asset.admin_comments || "No notes recorded."}</p></div></CardContent></Card><Card className="border-border/70 shadow-sm"><CardHeader><CardTitle className="text-base">Procurement</CardTitle></CardHeader><CardContent className="space-y-5"><div><p className="text-xs text-muted-foreground">Vendor</p><p className="mt-1 text-sm font-medium">{asset.purchased_from || "Not recorded"}</p></div><Separator /><div><p className="text-xs text-muted-foreground">Last known person</p><p className="mt-1 text-sm font-medium">{asset.last_known_person?.full_name || "Not recorded"}</p></div><Separator /><div><p className="text-xs text-muted-foreground">Last updated</p><p className="mt-1 text-sm font-medium">{formatDate(asset.updated_at, true)}</p></div></CardContent></Card></div></>
}

