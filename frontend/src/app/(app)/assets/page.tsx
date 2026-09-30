"use client"

import Link from "next/link"
import useSWR from "swr"
import { ArrowUpRight } from "lucide-react"

import { ResourcePage } from "@/components/resource-page"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { apiFetch, unpackResults } from "@/lib/api"
import { formatCurrency, formatDate } from "@/lib/format"
import type { Asset, Category, Department, Paginated, Person, StatusOption } from "@/lib/types"

export default function AssetsPage() {
  const { data: categories } = useSWR<Paginated<Category> | Category[]>("categories/?page_size=100", apiFetch)
  const { data: statuses } = useSWR<Paginated<StatusOption> | StatusOption[]>("status-options/?page_size=100", apiFetch)
  const { data: people } = useSWR<Paginated<Person> | Person[]>("people/?page_size=100", apiFetch)
  const { data: departments } = useSWR<Paginated<Department> | Department[]>("departments/?page_size=100", apiFetch)

  return <ResourcePage<Asset>
    eyebrow="Inventory"
    title="Assets"
    description="Search, register, and inspect every device in the organisation."
    endpoint="assets/"
    searchPlaceholder="Search asset ID, serial number, model, or assignee…"
    emptyMessage="Add the first asset to begin tracking inventory."
    rowHref={(item) => `/assets/${item.id}`}
    create={{ title: "New asset", description: "Register a device in the inventory.", buttonLabel: "Add asset", fields: [
      { name: "asset_id", label: "Asset ID", required: true, placeholder: "e.g. TAM-LAP-0142" },
      { name: "serial_number", label: "Serial number", required: true },
      { name: "model_description", label: "Model / description", required: true },
      { name: "category_id", label: "Category", type: "select", required: true, options: unpackResults(categories).map((item) => ({ label: item.name, value: String(item.id) })) },
      { name: "status_id", label: "Status", type: "select", required: true, options: unpackResults(statuses).map((item) => ({ label: item.name, value: String(item.id) })) },
      { name: "assigned_to_id", label: "Assigned to", type: "select", options: unpackResults(people).map((item) => ({ label: item.full_name, value: String(item.id) })) },
      { name: "department_id", label: "Department", type: "select", options: unpackResults(departments).map((item) => ({ label: item.name, value: String(item.id) })) },
      { name: "purchase_date", label: "Purchase date", type: "date" },
      { name: "purchased_from", label: "Vendor" },
      { name: "purchase_cost", label: "Purchase cost (KES)", type: "number" },
      { name: "admin_comments", label: "Notes", type: "textarea" },
    ] }}
    columns={[
      { label: "Asset", render: (item) => <div><p className="font-mono text-sm font-semibold">{item.asset_id}</p><p className="mt-0.5 max-w-56 truncate text-xs text-muted-foreground">{item.model_description}</p></div> },
      { label: "Category", render: (item) => item.category.name },
      { label: "Serial", render: (item) => <span className="font-mono text-xs">{item.serial_number}</span> },
      { label: "Assigned to", render: (item) => <div><p>{item.assigned_to?.full_name || "Unassigned"}</p><p className="text-xs text-muted-foreground">{item.department?.name || "No department"}</p></div> },
      { label: "Status", render: (item) => <StatusBadge value={item.status.name} /> },
      { label: "Purchased", render: (item) => <div><p>{formatDate(item.purchase_date)}</p><p className="text-xs text-muted-foreground">{formatCurrency(item.purchase_cost)}</p></div> },
      { label: "", className: "w-10", render: (item) => <Button asChild variant="ghost" size="icon-sm"><Link href={`/assets/${item.id}`} aria-label={`Open ${item.asset_id}`}><ArrowUpRight /></Link></Button> },
    ]}
  />
}

