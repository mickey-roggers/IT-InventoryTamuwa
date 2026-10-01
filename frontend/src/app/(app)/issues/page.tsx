"use client"

import useSWR from "swr"
import { MessageSquareText } from "lucide-react"
import { ResourcePage } from "@/components/resource-page"
import { StatusBadge } from "@/components/status-badge"
import { apiFetch, unpackResults } from "@/lib/api"
import { formatDate } from "@/lib/format"
import type { Asset, Department, Issue, Paginated } from "@/lib/types"

export default function IssuesPage() {
  const { data: assets } = useSWR<Paginated<Asset> | Asset[]>("assets/?page_size=100", apiFetch)
  const { data: departments } = useSWR<Paginated<Department> | Department[]>("departments/?page_size=100", apiFetch)
  return <ResourcePage<Issue> eyebrow="Support" title="Issues" description="Report operational problems and follow them through resolution." endpoint="issues/" searchPlaceholder="Search issue title or description…" emptyMessage="There are no reported issues."
    rowHref={(item) => `/issues/${item.id}`}
    filters={[{ name: "priority", label: "Priorities", options: ["Low", "Medium", "High", "Critical"].map((value) => ({ label: value, value })) }, { name: "status", label: "Statuses", options: ["Open", "Monitoring", "Resolved", "Closed"].map((value) => ({ label: value, value })) }]}
    ordering={[{ label: "Newest", value: "-created_at" }, { label: "Oldest", value: "created_at" }, { label: "Priority", value: "priority" }, { label: "Status", value: "status" }]}
    create={{ title: "New issue", description: "Report a problem for the ICT team.", buttonLabel: "Report issue", adminOnly: true, fields: [
      { name: "title", label: "Title", required: true },
      { name: "priority", label: "Priority", type: "select", required: true, defaultValue: "Medium", options: ["Low", "Medium", "High", "Critical"].map((value) => ({ label: value, value })) },
      { name: "status", label: "Status", type: "select", required: true, defaultValue: "Open", options: ["Open", "Monitoring", "Resolved", "Closed"].map((value) => ({ label: value, value })) },
      { name: "asset", label: "Related asset", type: "select", options: unpackResults(assets).map((item) => ({ label: item.asset_id, value: String(item.id) })) },
      { name: "department", label: "Department", type: "select", options: unpackResults(departments).map((item) => ({ label: item.name, value: String(item.id) })) },
      { name: "description", label: "Description", type: "textarea" },
    ] }}
    columns={[
      { label: "Issue", render: (item) => <div><p className="font-medium">{item.title}</p><p className="mt-0.5 max-w-md truncate text-xs text-muted-foreground">{item.description || "No description"}</p></div> },
      { label: "Priority", render: (item) => <StatusBadge value={item.priority} /> },
      { label: "Status", render: (item) => <StatusBadge value={item.status} /> },
      { label: "Reported by", render: (item) => item.reported_by_username || "System" },
      { label: "Comments", render: (item) => <span className="inline-flex items-center gap-1.5"><MessageSquareText className="size-3.5 text-muted-foreground" />{item.comments_count}</span> },
      { label: "Created", render: (item) => formatDate(item.created_at) },
    ]} />
}

