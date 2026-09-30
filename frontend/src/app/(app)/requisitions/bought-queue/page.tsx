"use client"

import Link from "next/link"
import useSWR from "swr"
import { ExternalLink, Link2 } from "lucide-react"

import { ResourceFormDialog } from "@/components/create-resource-dialog"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiFetch, unpackResults } from "@/lib/api"
import { formatCurrency } from "@/lib/format"
import type { Asset, Paginated, Requisition, RequisitionItem } from "@/lib/types"

export default function BoughtItemsQueuePage() {
  const { data, isLoading, mutate } = useSWR<Paginated<RequisitionItem> | RequisitionItem[]>("requisition-items/?bought_queue=true&page_size=200", apiFetch)
  const { data: requisitions } = useSWR<Paginated<Requisition> | Requisition[]>("requisitions/?page_size=200", apiFetch)
  const { data: assets } = useSWR<Paginated<Asset> | Asset[]>("assets/?page_size=200", apiFetch)
  const items = unpackResults(data)
  const reqMap = new Map(unpackResults(requisitions).map((item) => [item.id, item]))
  const assetOptions = unpackResults(assets).map((asset) => ({ label: `${asset.asset_id} · ${asset.model_description}`, value: String(asset.id) }))

  return <>
    <PageHeader eyebrow="Procurement intake" title="Bought items queue" description="Link each purchased asset line to its inventory record. Quantities greater than one remain queued until every unit is linked." />
    <Card className="overflow-hidden border-border/70 shadow-sm"><CardContent className="p-0">
      {isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-10" />)}</div> : items.length ? <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Requisition</TableHead><TableHead>Purchased item</TableHead><TableHead>Remaining</TableHead><TableHead>Total</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{items.map((item) => { const req = reqMap.get(item.requisition); return <TableRow key={item.id}><TableCell><p className="font-mono font-medium">{req?.req_no || `#${item.requisition}`}</p><p className="text-xs text-muted-foreground">{req?.company}</p></TableCell><TableCell className="font-medium">{item.item_name}</TableCell><TableCell>{item.quantity}</TableCell><TableCell>{formatCurrency(item.total_price)}</TableCell><TableCell><div className="flex justify-end gap-2"><ResourceFormDialog title="Link purchased item" description="Select the inventory asset created for this purchase." endpoint={`requisition-items/${item.id}/process/`} method="POST" fields={[{ name: "asset_id", label: "Inventory asset", type: "select", required: true, options: assetOptions }]} onSaved={() => mutate()} trigger={<Button size="sm"><Link2 />Link asset</Button>} /><Button asChild variant="ghost" size="icon-sm"><Link href={`/requisitions/${item.requisition}`} aria-label="Open requisition"><ExternalLink /></Link></Button></div></TableCell></TableRow> })}</TableBody></Table></div> : <p className="p-14 text-center text-muted-foreground">All bought asset items have been processed.</p>}
    </CardContent></Card>
  </>
}
