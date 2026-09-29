"use client"

import useSWR from "swr"
import { AlertCircle } from "lucide-react"
import { ResourcePage } from "@/components/resource-page"
import { StatusBadge } from "@/components/status-badge"
import { apiFetch, unpackResults } from "@/lib/api"
import { formatDate } from "@/lib/format"
import type { Paginated, Task } from "@/lib/types"

type UserSummary = { id: number; username: string; first_name: string; last_name: string }

export default function TasksPage() {
  const { data: users } = useSWR<Paginated<UserSummary> | UserSummary[]>("users/?page_size=100", apiFetch)
  return <ResourcePage<Task> eyebrow="Work queue" title="Tasks" description="Keep operational follow-ups visible, assigned, and on schedule." endpoint="tasks/" searchPlaceholder="Search tasks…" emptyMessage="No work is queued right now."
    create={{ title: "New task", description: "Add a task to the shared ICT work queue.", buttonLabel: "Add task", fields: [
      { name: "title", label: "Title", required: true },
      { name: "assigned_to", label: "Assignee", type: "select", options: unpackResults(users).map((item) => ({ label: `${item.first_name} ${item.last_name}`.trim() || item.username, value: String(item.id) })) },
      { name: "due_date", label: "Due date", type: "datetime-local" },
      { name: "priority", label: "Priority", type: "select", required: true, defaultValue: "Medium", options: ["Low", "Medium", "High", "Critical"].map((value) => ({ label: value, value })) },
      { name: "status", label: "Status", type: "select", required: true, defaultValue: "To Do", options: ["To Do", "In Progress", "Done"].map((value) => ({ label: value, value })) },
      { name: "description", label: "Description", type: "textarea" },
    ] }}
    columns={[
      { label: "Task", render: (item) => <div><p className="flex items-center gap-2 font-medium">{item.is_overdue && <AlertCircle className="size-4 text-destructive" />}{item.title}</p><p className="mt-0.5 max-w-md truncate text-xs text-muted-foreground">{item.description || "No description"}</p></div> },
      { label: "Priority", render: (item) => <StatusBadge value={item.priority} /> },
      { label: "Status", render: (item) => <StatusBadge value={item.status} /> },
      { label: "Assignee", render: (item) => item.assigned_to_username || "Unassigned" },
      { label: "Due", render: (item) => <span className={item.is_overdue ? "font-medium text-destructive" : ""}>{formatDate(item.due_date, true)}</span> },
      { label: "Created by", render: (item) => item.created_by_username || "System" },
    ]} />
}

