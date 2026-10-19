"use client"

import useSWR from "swr"
import { ResourcePage } from "@/components/resource-page"
import { StatusBadge } from "@/components/status-badge"
import { apiFetch, unpackResults } from "@/lib/api"
import { assetOptionLabel, formatCurrency, formatDate } from "@/lib/format"
import type { Asset, Issue, MaintenanceLog, Paginated, Requisition, Technician } from "@/lib/types"

type ActionOption = { id: number; name: string }

export default function MaintenancePage() {
  const { data: assets } = useSWR<Paginated<Asset> | Asset[]>("assets/?page_size=100", apiFetch)
  const { data: technicians } = useSWR<Paginated<Technician> | Technician[]>("technicians/?page_size=100", apiFetch)
  const { data: actions } = useSWR<Paginated<ActionOption> | ActionOption[]>("action-taken-options/?page_size=100", apiFetch)
  const { data: requisitions } = useSWR<Paginated<Requisition> | Requisition[]>("requisitions/?page_size=200", apiFetch)
  const { data: issues } = useSWR<Paginated<Issue> | Issue[]>("issues/?page_size=200", apiFetch)
  return <ResourcePage<MaintenanceLog> eyebrow="Service desk" title="Maintenance" description="Track faults, repairs, costs, and equipment return-to-service." endpoint="maintenance-logs/" searchPlaceholder="Search maintenance records…" emptyMessage="No maintenance work has been recorded."
    rowHref={(item) => `/maintenance/${item.id}`}
    filters={[{ name: "status", label: "Statuses", options: ["Open", "Closed"].map((value) => ({ label: value, value })) }, { name: "performed_by", label: "Technicians", options: unpackResults(technicians).map((item) => ({ label: `${item.technician_name} · ${item.company_name}`, value: String(item.id) })) }, { name: "issue", label: "Issues", options: unpackResults(issues).map((item) => ({ label: item.title, value: String(item.id) })) }]}
    ordering={[{ label: "Newest", value: "-timestamp" }, { label: "Oldest", value: "timestamp" }, { label: "Reported date", value: "-date_reported" }, { label: "Repair cost", value: "-cost_of_repair" }]}
    create={{ title: "Maintenance report", description: "Open a maintenance record for an asset.", buttonLabel: "Log maintenance", adminOnly: true, fields: [
      { name: "asset", label: "Asset", type: "select", required: true, options: unpackResults(assets).map((item) => ({ label: assetOptionLabel(item), value: item.asset_id })) },
      { name: "date_reported", label: "Date reported", type: "date", required: true, defaultValue: new Date().toISOString().slice(0, 10) },
      { name: "timestamp", label: "Maintenance date/time", type: "datetime-local" },
      { name: "date_completed", label: "Date completed", type: "date" },
      { name: "maintenance_status", label: "Status", type: "select", required: true, defaultValue: "Open", options: [{ label: "Open", value: "Open" }, { label: "Closed", value: "Closed" }] },
      { name: "performed_by_id", label: "Technician", type: "select", options: unpackResults(technicians).map((item) => ({ label: `${item.technician_name} · ${item.company_name}`, value: String(item.id) })) },
      { name: "action_taken_id", label: "Action taken", type: "select", options: unpackResults(actions).map((item) => ({ label: item.name, value: String(item.id) })) },
      { name: "requisition", label: "Requisition", type: "select", options: unpackResults(requisitions).map((item) => ({ label: `${item.req_no} · ${item.title}`, value: String(item.id) })) },
      { name: "issue", label: "Related issue", type: "select", nullable: true, options: unpackResults(issues).map((item) => ({ label: item.title, value: String(item.id) })) },
      { name: "cost_of_repair", label: "Repair cost (KES)", type: "number" },
      { name: "description", label: "Issue description", type: "textarea", required: true },
      { name: "notes", label: "Notes", type: "textarea" },
    ] }}
    columns={[
      { label: "Alias name", render: (item) => <div><p className="font-semibold">{item.asset_alias_name || item.asset}</p>{item.asset_alias_name && <p className="font-mono text-xs text-muted-foreground">{item.asset}</p>}</div> },
      { label: "Reported", render: (item) => formatDate(item.date_reported) },
      { label: "Issue", render: (item) => <p className="max-w-sm truncate">{item.description}</p> },
      { label: "Linked issue", render: (item) => unpackResults(issues).find((issue) => issue.id === item.issue)?.title || "—" },
      { label: "Technician", render: (item) => item.performed_by?.technician_name || "Unassigned" },
      { label: "Cost", render: (item) => formatCurrency(item.cost_of_repair) },
      { label: "Status", render: (item) => <StatusBadge value={item.maintenance_status} /> },
    ]} />
}

