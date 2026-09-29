"use client"

import { MessageSquareText } from "lucide-react"
import { ResourcePage } from "@/components/resource-page"
import { StatusBadge } from "@/components/status-badge"
import { formatDate } from "@/lib/format"
import type { Project } from "@/lib/types"

export default function ProjectsPage() {
  return <ResourcePage<Project> eyebrow="Planning" title="Projects" description="Coordinate ICT initiatives, priorities, target dates, and outcomes." endpoint="projects/" searchPlaceholder="Search projects…" emptyMessage="No projects have been created."
    create={{ title: "New project", description: "Create an ICT project record.", buttonLabel: "Add project", fields: [
      { name: "title", label: "Title", required: true },
      { name: "date", label: "Target date", type: "date" },
      { name: "priority", label: "Priority", type: "select", required: true, defaultValue: "Medium", options: ["Low", "Medium", "High"].map((value) => ({ label: value, value })) },
      { name: "status", label: "Status", type: "select", required: true, defaultValue: "Pending", options: ["Pending", "Done", "Rejected"].map((value) => ({ label: value, value })) },
      { name: "description", label: "Description", type: "textarea" },
      { name: "problem_statement", label: "Problem statement", type: "textarea" },
      { name: "cost_breakdown", label: "Cost breakdown", type: "textarea" },
      { name: "conclusion", label: "Conclusion", type: "textarea" },
    ] }}
    columns={[
      { label: "Project", render: (item) => <div><p className="font-medium">{item.title}</p><p className="mt-0.5 max-w-md truncate text-xs text-muted-foreground">{item.description || "No description"}</p></div> },
      { label: "Priority", render: (item) => <StatusBadge value={item.priority} /> },
      { label: "Status", render: (item) => <StatusBadge value={item.status} /> },
      { label: "Target date", render: (item) => formatDate(item.date) },
      { label: "Owner", render: (item) => item.reported_by_username || "System" },
      { label: "Comments", render: (item) => <span className="inline-flex items-center gap-1.5"><MessageSquareText className="size-3.5 text-muted-foreground" />{item.comments_count}</span> },
    ]} />
}

