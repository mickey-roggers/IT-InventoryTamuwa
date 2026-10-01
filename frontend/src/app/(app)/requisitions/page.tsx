"use client"

import useSWR from "swr"
import { ResourcePage } from "@/components/resource-page"
import { StatusBadge } from "@/components/status-badge"
import { apiFetch, unpackResults } from "@/lib/api"
import { formatCurrency, formatDate } from "@/lib/format"
import type { Issue, Paginated, Project, Requisition } from "@/lib/types"

export default function RequisitionsPage() {
  const { data: issues } = useSWR<Paginated<Issue> | Issue[]>("issues/?page_size=200", apiFetch)
  const { data: projects } = useSWR<Paginated<Project> | Project[]>("projects/?page_size=200", apiFetch)
  return <ResourcePage<Requisition> eyebrow="Procurement" title="Requisitions" description="Monitor purchase requests and their approval or buying status." endpoint="requisitions/" searchPlaceholder="Search requisition number or title…" emptyMessage="No requisitions have been raised."
    rowHref={(item) => `/requisitions/${item.id}`}
    filters={[{ name: "status", label: "Statuses", options: ["Pending", "Approved", "Rejected", "On Hold", "Bought"].map((value) => ({ label: value, value })) }]}
    ordering={[{ label: "Newest", value: "-created_at" }, { label: "Oldest", value: "created_at" }, { label: "Number A–Z", value: "req_no" }, { label: "Title A–Z", value: "title" }, { label: "Status", value: "status" }]}
    create={{ title: "New requisition", description: "Open a procurement request with its first item.", buttonLabel: "New requisition", adminOnly: true, transformPayload: (payload) => {
      const { item_type, item_name, unit_price, quantity, is_approved, rejection_reason, ...requisition } = payload
      return { ...requisition, items: [{ item_type, item_name, unit_price, quantity, is_approved, rejection_reason }] }
    }, fields: [
      { name: "req_no", label: "Requisition number", required: true, placeholder: "e.g. REQ-2026-041" },
      { name: "company", label: "Company", type: "select", required: true, defaultValue: "Tamuwa", options: ["Tamuwa", "Tera", "Flux"].map((value) => ({ label: value, value })) },
      { name: "title", label: "Title", required: true },
      { name: "status", label: "Status", type: "select", required: true, defaultValue: "Pending", options: ["Pending", "Approved", "Rejected", "On Hold", "Bought"].map((value) => ({ label: value, value })) },
      { name: "description", label: "Description", type: "textarea" },
      { name: "linked_issue", label: "Linked issue", type: "select", options: unpackResults(issues).filter((item) => item.status !== "Closed").map((item) => ({ label: item.title, value: String(item.id) })) },
      { name: "linked_project", label: "Linked project", type: "select", options: unpackResults(projects).filter((item) => item.status !== "Done").map((item) => ({ label: item.title, value: String(item.id) })) },
      { name: "item_name", label: "First item / service", required: true },
      { name: "item_type", label: "Item type", type: "select", required: true, defaultValue: "Asset", options: ["Asset", "Service"].map((value) => ({ label: value, value })) },
      { name: "unit_price", label: "Unit price (KES)", type: "number", required: true },
      { name: "quantity", label: "Quantity", type: "number", required: true, defaultValue: 1 },
      { name: "is_approved", label: "Approved", type: "checkbox", defaultValue: true },
      { name: "rejection_reason", label: "Reason if not approved" },
    ] }}
    columns={[
      { label: "Requisition", render: (item) => <div><p className="font-mono font-semibold">{item.req_no}</p><p className="mt-0.5 max-w-sm truncate text-xs text-muted-foreground">{item.title}</p></div> },
      { label: "Company", render: (item) => item.company },
      { label: "Status", render: (item) => <StatusBadge value={item.status} /> },
      { label: "Items", render: (item) => item.items.length },
      { label: "Approved total", render: (item) => <span className="font-mono">{formatCurrency(item.total_amount)}</span> },
      { label: "Created", render: (item) => <div><p>{formatDate(item.created_at)}</p><p className="text-xs text-muted-foreground">{item.created_by_username || "System"}</p></div> },
    ]} />
}

