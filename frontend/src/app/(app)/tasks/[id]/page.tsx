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
import { formatDate, toDateTimeLocal } from "@/lib/format"
import type { Paginated, Task, User } from "@/lib/types"

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: task, error, isLoading, mutate } = useSWR<Task>(`tasks/${id}/`, apiFetch)
  const { data: users } = useSWR<Paginated<User> | User[]>("users/?page_size=200", apiFetch)
  if (isLoading) return <Skeleton className="h-[30rem]" />
  if (error || !task) return <p className="rounded-xl border p-10 text-center">Task not found.</p>

  const fields = [
    { name: "title", label: "Title", required: true, defaultValue: task.title },
    { name: "assigned_to", label: "Assignee", type: "select" as const, nullable: true, defaultValue: task.assigned_to, options: unpackResults(users).map((item) => ({ label: `${item.first_name} ${item.last_name}`.trim() || item.username, value: String(item.id) })) },
    { name: "due_date", label: "Due date", type: "datetime-local" as const, nullable: true, defaultValue: toDateTimeLocal(task.due_date) },
    { name: "priority", label: "Priority", type: "select" as const, required: true, defaultValue: task.priority, options: ["Low", "Medium", "High", "Critical"].map((value) => ({ label: value, value })) },
    { name: "status", label: "Status", type: "select" as const, required: true, defaultValue: task.status, options: ["To Do", "In Progress", "Done"].map((value) => ({ label: value, value })) },
    { name: "description", label: "Description", type: "textarea" as const, defaultValue: task.description },
  ]

  return <>
    <Button asChild variant="ghost" className="mb-4 -ml-2"><Link href="/tasks"><ArrowLeft />Back to tasks</Link></Button>
    <PageHeader eyebrow="Task" title={task.title} description={task.assigned_to_username ? `Assigned to ${task.assigned_to_username}` : "Unassigned"} actions={<RecordActions endpoint={`tasks/${id}/`} backHref="/tasks" label="Task" fields={fields} onChanged={() => mutate()} />} />
    <div className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
      <DetailCard title="Description"><p className="whitespace-pre-wrap leading-6">{task.description || "No description provided."}</p></DetailCard>
      <DetailCard title="Task status"><DetailGrid items={[
        { label: "Priority", value: <StatusBadge value={task.priority} /> },
        { label: "Status", value: <StatusBadge value={task.status} /> },
        { label: "Assignee", value: task.assigned_to_username },
        { label: "Due", value: <span className={task.is_overdue ? "text-destructive" : ""}>{formatDate(task.due_date, true)}</span> },
        { label: "Created by", value: task.created_by_username },
        { label: "Last updated", value: formatDate(task.updated_at, true) },
      ]} /></DetailCard>
    </div>
  </>
}
