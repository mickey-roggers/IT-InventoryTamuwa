"use client"

import { ResourcePage } from "@/components/resource-page"
import { StatusBadge } from "@/components/status-badge"
import { formatCurrency, formatDate } from "@/lib/format"
import type { Requisition } from "@/lib/types"

export default function RequisitionsPage() {
  return <ResourcePage<Requisition> eyebrow="Procurement" title="Requisitions" description="Monitor purchase requests and their approval or buying status." endpoint="requisitions/" searchPlaceholder="Search requisition number or title…" emptyMessage="No requisitions have been raised."
    rowHref={(item) => `/requisitions/${item.id}`}
    create={{ title: "New requisition", description: "Open a new procurement request. Items can be managed through the API/admin.", buttonLabel: "New requisition", fields: [
      { name: "req_no", label: "Requisition number", required: true, placeholder: "e.g. REQ-2026-041" },
      { name: "company", label: "Company", type: "select", required: true, defaultValue: "Tamuwa", options: ["Tamuwa", "Tera", "Flux"].map((value) => ({ label: value, value })) },
      { name: "title", label: "Title", required: true },
      { name: "status", label: "Status", type: "select", required: true, defaultValue: "Pending", options: ["Pending", "Approved", "Rejected", "On Hold", "Bought"].map((value) => ({ label: value, value })) },
      { name: "description", label: "Description", type: "textarea" },
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

