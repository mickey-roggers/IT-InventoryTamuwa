"use client"

import Link from "next/link"
import useSWR from "swr"
import { ExternalLink } from "lucide-react"

import { CreateResourceDialog } from "@/components/create-resource-dialog"
import { PageHeader } from "@/components/page-header"
import { DeleteResourceButton } from "@/components/record-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiFetch, unpackResults } from "@/lib/api"
import { formatDate } from "@/lib/format"
import type { Asset, AssetLink, Paginated } from "@/lib/types"

export default function AssetLinksPage() {
  const { data, isLoading, mutate } = useSWR<Paginated<AssetLink> | AssetLink[]>("asset-links/?page_size=200", apiFetch)
  const { data: assets } = useSWR<Paginated<Asset> | Asset[]>("assets/?page_size=200", apiFetch)
  const assetOptions = unpackResults(assets).map((asset) => ({ label: `${asset.asset_id} · ${asset.model_description}`, value: String(asset.id) }))
  const assetMap = new Map(unpackResults(assets).map((asset) => [asset.id, asset]))
  const links = unpackResults(data)

  return <>
    <PageHeader eyebrow="Inventory relationships" title="Asset links" description="Connect related equipment such as laptops, docks, chargers, monitors, and peripherals." actions={<CreateResourceDialog title="Asset link" description="Choose two inventory records to connect." endpoint="asset-links/" buttonLabel="Link assets" fields={[{ name: "asset", label: "Primary asset", type: "select", required: true, options: assetOptions }, { name: "linked_asset", label: "Related asset", type: "select", required: true, options: assetOptions }, { name: "notes", label: "Notes", type: "textarea" }]} onCreated={() => mutate()} />} />
    <Card className="overflow-hidden border-border/70 shadow-sm"><CardContent className="p-0">
      {isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-10" />)}</div> : links.length ? <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Primary asset</TableHead><TableHead>Linked asset</TableHead><TableHead>Notes</TableHead><TableHead>Linked</TableHead><TableHead /></TableRow></TableHeader><TableBody>{links.map((link) => <TableRow key={link.id}><TableCell><AssetLinkCell asset={assetMap.get(link.asset)} label={link.asset_display} /></TableCell><TableCell><AssetLinkCell asset={assetMap.get(link.linked_asset)} label={link.linked_asset_display} /></TableCell><TableCell className="max-w-md text-muted-foreground">{link.notes || "—"}</TableCell><TableCell>{formatDate(link.created_at)}</TableCell><TableCell><div className="flex justify-end"><DeleteResourceButton endpoint={`asset-links/${link.id}/`} label="Asset link" onDeleted={() => mutate()} iconOnly /></div></TableCell></TableRow>)}</TableBody></Table></div> : <p className="p-14 text-center text-muted-foreground">No assets have been linked yet.</p>}
    </CardContent></Card>
  </>
}

function AssetLinkCell({ asset, label }: { asset: Asset | undefined; label: string }) {
  return <div className="flex items-center gap-2"><div><p className="font-mono font-medium">{label}</p><p className="text-xs text-muted-foreground">{asset?.model_description}</p></div>{asset && <Button asChild variant="ghost" size="icon-sm"><Link href={`/assets/${asset.id}`} aria-label={`Open ${label}`}><ExternalLink /></Link></Button>}</div>
}
