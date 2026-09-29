"use client"

import { ResourcePage } from "@/components/resource-page"
import { StatusBadge } from "@/components/status-badge"
import { formatDate } from "@/lib/format"

type ActivityItem = {
  id: number
  asset: string | null
  user: { username: string; first_name: string; last_name: string } | null
  action: string
  description: string
  old_value: string
  new_value: string
  timestamp: string
}

export default function ActivityPage() {
  return <ResourcePage<ActivityItem> eyebrow="Audit" title="Activity log" description="A read-only history of critical inventory changes and assignments." endpoint="activity-logs/" searchPlaceholder="Browse recorded activity…" emptyMessage="No inventory activity has been recorded."
    columns={[
      { label: "Time", render: (item) => <span className="whitespace-nowrap">{formatDate(item.timestamp, true)}</span> },
      { label: "Asset", render: (item) => <span className="font-mono font-medium">{item.asset || "—"}</span> },
      { label: "Action", render: (item) => <StatusBadge value={item.action.replaceAll("_", " ")} /> },
      { label: "User", render: (item) => item.user?.username || "System" },
      { label: "Description", render: (item) => <p className="max-w-xl truncate text-muted-foreground">{item.description}</p> },
    ]} />
}

