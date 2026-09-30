"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import useSWR from "swr"
import { ArrowLeft } from "lucide-react"

import { DetailCard, DetailGrid } from "@/components/detail-card"
import { PageHeader } from "@/components/page-header"
import { RecordActions } from "@/components/record-actions"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch, unpackResults } from "@/lib/api"
import { formatCurrency, formatDate } from "@/lib/format"
import type { Asset, MaintenanceLog, Paginated, Requisition, Technician, User } from "@/lib/types"

type ActionOption = { id: number; name: string }

export default function MaintenanceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: record, error, isLoading, mutate } = useSWR<MaintenanceLog>(`maintenance-logs/${id}/`, apiFetch)
  const { data: assets } = useSWR<Paginated<Asset> | Asset[]>("assets/?page_size=200", apiFetch)
  const { data: technicians } = useSWR<Paginated<Technician> | Technician[]>("technicians/?page_size=200", apiFetch)
  const { data: actions } = useSWR<Paginated<ActionOption> | ActionOption[]>("action-taken-options/?page_size=200", apiFetch)
  const { data: requisitions } = useSWR<Paginated<Requisition> | Requisition[]>("requisitions/?page_size=200", apiFetch)
  const { data: users } = useSWR<Paginated<User> | User[]>("users/?page_size=200", apiFetch)
  if (isLoading) return <Skeleton className="h-[32rem]" />
  if (error || !record) return <p className="rounded-xl border p-10 text-center">Maintenance record not found.</p>

  const fields = [
    { name: "asset", label: "Asset", type: "select" as const, required: true, defaultValue: record.asset, options: unpackResults(assets).map((item) => ({ label: `${item.asset_id} · ${item.model_description}`, value: item.asset_id })) },
    { name: "date_reported", label: "Date reported", type: "date" as const, required: true, defaultValue: record.date_reported },
    { name: "date_completed", label: "Date completed", type: "date" as const, nullable: true, defaultValue: record.date_completed },
    { name: "maintenance_status", label: "Status", type: "select" as const, required: true, defaultValue: record.maintenance_status, options: ["Open", "Closed"].map((value) => ({ label: value, value })) },
    { name: "action_taken_id", label: "Action taken", type: "select" as const, nullable: true, defaultValue: record.action_taken?.id, options: unpackResults(actions).map((item) => ({ label: item.name, value: String(item.id) })) },
    { name: "performed_by_id", label: "Technician", type: "select" as const, nullable: true, defaultValue: record.performed_by?.id, options: unpackResults(technicians).map((item) => ({ label: `${item.technician_name} · ${item.company_name}`, value: String(item.id) })) },
    { name: "completed_by_id", label: "Completed by", type: "select" as const, nullable: true, defaultValue: unpackResults(users).find((user) => user.username === record.completed_by)?.id, options: unpackResults(users).map((item) => ({ label: item.username, value: String(item.id) })) },
    { name: "requisition", label: "Requisition", type: "select" as const, nullable: true, defaultValue: record.requisition, options: unpackResults(requisitions).map((item) => ({ label: `${item.req_no} · ${item.title}`, value: String(item.id) })) },
    { name: "cost_of_repair", label: "Repair cost (KES)", type: "number" as const, nullable: true, defaultValue: record.cost_of_repair },
    { name: "description", label: "Issue description", type: "textarea" as const, required: true, defaultValue: record.description },
    { name: "notes", label: "Notes", type: "textarea" as const, defaultValue: record.notes },
  ]

  return <>
    <Button asChild variant="ghost" className="mb-4 -ml-2"><Link href="/maintenance"><ArrowLeft />Back to maintenance</Link></Button>
    <PageHeader eyebrow="Maintenance record" title={record.asset} description={record.description} actions={<RecordActions endpoint={`maintenance-logs/${id}/`} backHref="/maintenance" label="Maintenance record" fields={fields} onChanged={() => mutate()} />} />
    <div className="grid gap-4 lg:grid-cols-2">
      <DetailCard title="Service details"><DetailGrid items={[
        { label: "Status", value: <StatusBadge value={record.maintenance_status} /> },
        { label: "Date reported", value: formatDate(record.date_reported) },
        { label: "Date completed", value: formatDate(record.date_completed) },
        { label: "Action taken", value: record.action_taken?.name },
        { label: "Technician", value: record.performed_by ? `${record.performed_by.technician_name} · ${record.performed_by.company_name}` : "Unassigned" },
        { label: "Repair cost", value: formatCurrency(record.cost_of_repair) },
      ]} /></DetailCard>
      <DetailCard title="Tracking"><DetailGrid items={[
        { label: "Reported by", value: record.reported_by },
        { label: "Completed by", value: record.completed_by },
        { label: "Requisition", value: record.requisition ? <Link className="text-primary hover:underline" href={`/requisitions/${record.requisition}`}>Open requisition</Link> : "—" },
        { label: "Last updated", value: formatDate(record.updated_at, true) },
      ]} /></DetailCard>
      <DetailCard title="Description"><p className="whitespace-pre-wrap leading-6">{record.description}</p></DetailCard>
      <DetailCard title="Notes"><p className="whitespace-pre-wrap leading-6 text-muted-foreground">{record.notes || "No notes recorded."}</p></DetailCard>
    </div>
  </>
}
