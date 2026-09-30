"use client"

import Link from "next/link"
import useSWR from "swr"
import { Check, ExternalLink } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiFetch, unpackResults } from "@/lib/api"
import { formatCurrency } from "@/lib/format"
import type { Paginated, Requisition, RequisitionItem } from "@/lib/types"

export default function UnapprovedItemsPage() {
  const { data, isLoading, mutate } = useSWR<Paginated<RequisitionItem> | RequisitionItem[]>("requisition-items/?is_approved=false&page_size=200", apiFetch)
  const { data: requisitions } = useSWR<Paginated<Requisition> | Requisition[]>("requisitions/?page_size=200", apiFetch)
  const items = unpackResults(data)
  const reqMap = new Map(unpackResults(requisitions).map((item) => [item.id, item]))

  async function approve(item: RequisitionItem) {
    await apiFetch(`requisition-items/${item.id}/`, { method: "PATCH", body: JSON.stringify({ is_approved: true, rejection_reason: "" }) })
    mutate()
  }

  return <>
    <PageHeader eyebrow="Procurement review" title="Not approved items" description="Review rejected or excluded requisition lines and restore them when approved." />
    <Card className="overflow-hidden border-border/70 shadow-sm"><CardContent className="p-0">
      {isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-10" />)}</div> : items.length ? <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Requisition</TableHead><TableHead>Item</TableHead><TableHead>Value</TableHead><TableHead>Reason</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{items.map((item) => { const req = reqMap.get(item.requisition); return <TableRow key={item.id}><TableCell><p className="font-mono font-medium">{req?.req_no || `#${item.requisition}`}</p><p className="text-xs text-muted-foreground">{req?.company}</p></TableCell><TableCell><p className="font-medium">{item.item_name}</p><p className="text-xs text-muted-foreground">{item.quantity} × {formatCurrency(item.unit_price)}</p></TableCell><TableCell>{formatCurrency(item.total_price)}</TableCell><TableCell className="max-w-sm text-muted-foreground">{item.rejection_reason || "No reason recorded"}</TableCell><TableCell><div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => approve(item)}><Check />Approve</Button><Button asChild variant="ghost" size="icon-sm"><Link href={`/requisitions/${item.requisition}`} aria-label="Open requisition"><ExternalLink /></Link></Button></div></TableCell></TableRow> })}</TableBody></Table></div> : <p className="p-14 text-center text-muted-foreground">There are no unapproved items.</p>}
    </CardContent></Card>
  </>
}
