"use client"

import useSWR from "swr"
import { Archive, Boxes, CheckCircle2, CircleDot, CircleHelp, Download, Wrench } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiFetch } from "@/lib/api"
import type { AssetQuantity } from "@/lib/types"

export default function QuantitiesPage() {
  const { data, isLoading } = useSWR<AssetQuantity[]>("asset-quantities/", apiFetch)
  const rows = data || []
  const totals = rows.reduce((value, row) => ({ total: value.total + row.total, available: value.available + row.available, in_use: value.in_use + row.in_use, maintenance: value.maintenance + row.maintenance, missing: value.missing + row.missing, retired: value.retired + row.retired }), { total: 0, available: 0, in_use: 0, maintenance: 0, missing: 0, retired: 0 })
  const cards = [{ label: "Total assets", value: totals.total, icon: Boxes }, { label: "Available", value: totals.available, icon: CheckCircle2 }, { label: "In use", value: totals.in_use, icon: CircleDot }, { label: "Maintenance", value: totals.maintenance, icon: Wrench }, { label: "Missing", value: totals.missing, icon: CircleHelp }, { label: "Retired", value: totals.retired, icon: Archive }]

  return <>
    <PageHeader
      eyebrow="Inventory levels"
      title="Asset quantities"
      description="Current stock totals and availability grouped by asset category."
      actions={
        <Button asChild variant="outline">
          <a href="/api/backend/assets/export/" download>
            <Download />
            Export Excel
          </a>
        </Button>
      }
    />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">{cards.map((card) => <Card key={card.label}><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">{card.label}</p><p className="mt-2 font-mono text-3xl font-semibold">{card.value}</p></div><card.icon className="size-6 text-primary" /></CardContent></Card>)}</div>
    <Card className="mt-4 overflow-hidden border-border/70 shadow-sm"><CardContent className="p-0">{isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-10" />)}</div> : rows.length ? <Table><TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Total</TableHead><TableHead>Available</TableHead><TableHead>In use</TableHead><TableHead>Maintenance</TableHead><TableHead>Missing</TableHead><TableHead>Retired</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell className="font-medium">{row.name}</TableCell><TableCell className="font-mono">{row.total}</TableCell><TableCell className="font-mono text-emerald-700">{row.available}</TableCell><TableCell className="font-mono">{row.in_use}</TableCell><TableCell className="font-mono text-amber-700">{row.maintenance}</TableCell><TableCell className="font-mono text-red-700">{row.missing}</TableCell><TableCell className="font-mono text-muted-foreground">{row.retired}</TableCell></TableRow>)}</TableBody></Table> : <p className="p-14 text-center text-muted-foreground">No asset quantities are available.</p>}</CardContent></Card>
  </>
}
