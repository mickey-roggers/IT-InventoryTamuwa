"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import useSWR from "swr"
import { ArrowLeft } from "lucide-react"

import { DetailCard, DetailGrid } from "@/components/detail-card"
import { PageHeader } from "@/components/page-header"
import { RecordActions } from "@/components/record-actions"
import { RelatedCollection } from "@/components/related-collection"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch, unpackResults } from "@/lib/api"
import { formatCurrency, formatDate } from "@/lib/format"
import type { Paginated, Technician, TechnicianAssistant, TechnicianRecommendation, TechnicianService } from "@/lib/types"

export default function TechnicianDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: technician, error, isLoading, mutate } = useSWR<Technician>(`technicians/${id}/`, apiFetch)
  const { data: recommendations, mutate: mutateRecommendations } = useSWR<Paginated<TechnicianRecommendation> | TechnicianRecommendation[]>(`technician-recommendations/?technician=${id}&page_size=200`, apiFetch)
  if (isLoading) return <Skeleton className="h-[36rem]" />
  if (error || !technician) return <p className="rounded-xl border p-10 text-center">Technician not found.</p>

  const fields = [
    { name: "company_name", label: "Company", required: true, defaultValue: technician.company_name },
    { name: "technician_name", label: "Technician name", required: true, defaultValue: technician.technician_name },
    { name: "email", label: "Email", type: "email" as const, defaultValue: technician.email },
    { name: "phone_number", label: "Phone", defaultValue: technician.phone_number },
    { name: "alternate_phone", label: "Alternate phone", defaultValue: technician.alternate_phone },
    { name: "specialization", label: "Specialization", defaultValue: technician.specialization },
    { name: "address", label: "Address", type: "textarea" as const, defaultValue: technician.address },
    { name: "is_active", label: "Active technician", type: "checkbox" as const, defaultValue: technician.is_active },
  ]
  const assistantFields = (item?: TechnicianAssistant) => [
    { name: "name", label: "Name", required: true, defaultValue: item?.name },
    { name: "role", label: "Role", defaultValue: item?.role },
    { name: "phone_number", label: "Phone", defaultValue: item?.phone_number },
    { name: "email", label: "Email", type: "email" as const, defaultValue: item?.email },
    { name: "is_active", label: "Active", type: "checkbox" as const, defaultValue: item?.is_active ?? true },
  ]
  const serviceFields = (item?: TechnicianService) => [
    { name: "service_name", label: "Service / repair", required: true, defaultValue: item?.service_name },
    { name: "typical_cost", label: "Typical cost (KES)", type: "number" as const, nullable: true, defaultValue: item?.typical_cost },
    { name: "description", label: "Description", type: "textarea" as const, defaultValue: item?.description },
    { name: "is_active", label: "Active service", type: "checkbox" as const, defaultValue: item?.is_active ?? true },
  ]
  const recommendationFields = (item?: TechnicianRecommendation) => [
    { name: "category_name", label: "Category / item", defaultValue: item?.category_name },
    { name: "recommendation_type", label: "Recommendation", type: "select" as const, required: true, defaultValue: item?.recommendation_type, options: [["REPAIR", "Repair"], ["REPLACE", "Replace"], ["UPGRADE", "Upgrade"], ["MAINTENANCE", "Regular maintenance"], ["DISPOSE", "Dispose"], ["OTHER", "Other"]].map(([value, label]) => ({ value, label })) },
    { name: "priority", label: "Priority", type: "select" as const, required: true, defaultValue: item?.priority || "MEDIUM", options: ["LOW", "MEDIUM", "HIGH", "URGENT"].map((value) => ({ value, label: value })) },
    { name: "estimated_cost", label: "Estimated cost (KES)", type: "number" as const, nullable: true, defaultValue: item?.estimated_cost },
    { name: "completed_date", label: "Completed date", type: "date" as const, nullable: true, defaultValue: item?.completed_date },
    { name: "is_completed", label: "Completed", type: "checkbox" as const, defaultValue: item?.is_completed ?? false },
    { name: "description", label: "Recommendation details", type: "textarea" as const, required: true, defaultValue: item?.description },
    { name: "notes", label: "Notes", type: "textarea" as const, defaultValue: item?.notes },
  ]

  return <>
    <Button asChild variant="ghost" className="mb-4 -ml-2"><Link href="/technicians"><ArrowLeft />Back to technicians</Link></Button>
    <PageHeader eyebrow="Service network" title={technician.technician_name} description={technician.company_name} actions={<RecordActions endpoint={`technicians/${id}/`} backHref="/technicians" label="Technician" fields={fields} onChanged={() => mutate()} />} />
    <div className="grid gap-4 lg:grid-cols-2">
      <DetailCard title="Contact"><DetailGrid items={[
        { label: "Email", value: technician.email },
        { label: "Phone", value: technician.phone_number },
        { label: "Alternate phone", value: technician.alternate_phone },
        { label: "Status", value: <StatusBadge value={technician.is_active ? "Active" : "Inactive"} /> },
      ]} /></DetailCard>
      <DetailCard title="Service profile"><DetailGrid items={[
        { label: "Specialization", value: technician.specialization },
        { label: "Address", value: technician.address },
        { label: "Added", value: formatDate(technician.created_at) },
        { label: "Updated", value: formatDate(technician.updated_at, true) },
      ]} /></DetailCard>
    </div>
    <div className="mt-4 grid gap-4 xl:grid-cols-2">
      <RelatedCollection title="Assistants" items={technician.assistants} endpoint="technician-assistants/" createLabel="Assistant" createValues={{ technician: Number(id) }} createFields={assistantFields()} editFields={assistantFields} render={(item) => <><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.role || "Assistant"} · {item.phone_number || item.email || "No contact"}</p></>} emptyMessage="No assistants recorded." onChanged={() => mutate()} />
      <RelatedCollection title="Services" items={technician.services} endpoint="technician-services/" createLabel="Service" createValues={{ technician: Number(id) }} createFields={serviceFields()} editFields={serviceFields} render={(item) => <><p className="font-medium">{item.service_name}</p><p className="text-xs text-muted-foreground">{formatCurrency(item.typical_cost)} · {item.description || "No description"}</p></>} emptyMessage="No services recorded." onChanged={() => mutate()} />
    </div>
    <div className="mt-4">
      <RelatedCollection title="Recommendations" items={unpackResults(recommendations)} endpoint="technician-recommendations/" createLabel="Recommendation" createValues={{ technician: Number(id) }} createFields={recommendationFields()} editFields={recommendationFields} render={(item) => <><div className="flex flex-wrap gap-2"><p className="font-medium">{item.category_name || "General"}</p><StatusBadge value={item.recommendation_type} /><StatusBadge value={item.priority} />{item.is_completed && <StatusBadge value="Completed" />}</div><p className="mt-2 text-sm text-muted-foreground">{item.description}</p><p className="mt-1 text-xs text-muted-foreground">Estimate {formatCurrency(item.estimated_cost)} · {formatDate(item.created_at)}</p></>} emptyMessage="No recommendations recorded." onChanged={() => mutateRecommendations()} />
    </div>
  </>
}
