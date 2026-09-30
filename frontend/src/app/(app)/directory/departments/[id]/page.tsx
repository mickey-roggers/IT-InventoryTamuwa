"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import useSWR from "swr"
import { ArrowLeft, ArrowUpRight } from "lucide-react"

import { DetailCard } from "@/components/detail-card"
import { PageHeader } from "@/components/page-header"
import { RecordActions } from "@/components/record-actions"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch, unpackResults } from "@/lib/api"
import type { Asset, Department, Paginated, Person } from "@/lib/types"

export default function DepartmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: department, error, isLoading, mutate } = useSWR<Department>(`departments/${id}/`, apiFetch)
  const { data: people } = useSWR<Paginated<Person> | Person[]>(`people/?department=${id}&page_size=200`, apiFetch)
  const { data: assets } = useSWR<Paginated<Asset> | Asset[]>(`assets/?department=${id}&page_size=200`, apiFetch)
  if (isLoading) return <Skeleton className="h-80" />
  if (error || !department) return <p className="rounded-xl border p-10 text-center">Department not found.</p>
  const fields = [{ name: "name", label: "Name", required: true, defaultValue: department.name }, { name: "description", label: "Description", type: "textarea" as const, defaultValue: department.description }]
  return <><Button asChild variant="ghost" className="mb-4 -ml-2"><Link href="/directory"><ArrowLeft />Back to directory</Link></Button><PageHeader eyebrow="Department" title={department.name} description={department.description || "Organisational department"} actions={<RecordActions endpoint={`departments/${id}/`} backHref="/directory" label="Department" fields={fields} onChanged={() => mutate()} />} /><div className="grid gap-4 xl:grid-cols-2"><DetailCard title={`People · ${unpackResults(people).length}`}><SimpleList items={unpackResults(people).map((person) => ({ id: person.id, label: person.full_name, href: `/directory/people/${person.id}` }))} empty="No people belong to this department." /></DetailCard><DetailCard title={`Assets · ${unpackResults(assets).length}`}><SimpleList items={unpackResults(assets).map((asset) => ({ id: asset.id, label: `${asset.asset_id} · ${asset.model_description}`, href: `/assets/${asset.id}` }))} empty="No assets belong to this department." /></DetailCard></div></>
}

function SimpleList({ items, empty }: { items: Array<{ id: number; label: string; href: string }>; empty: string }) { return items.length ? <div className="divide-y rounded-lg border">{items.map((item) => <div key={item.id} className="flex items-center justify-between p-3"><span className="font-medium">{item.label}</span><Button asChild variant="ghost" size="icon-sm"><Link href={item.href}><ArrowUpRight /></Link></Button></div>)}</div> : <p className="py-8 text-center text-muted-foreground">{empty}</p> }
