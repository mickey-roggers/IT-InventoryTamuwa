"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import useSWR from "swr"
import { ArrowLeft, KeyRound, Power } from "lucide-react"

import { ResourceFormDialog } from "@/components/create-resource-dialog"
import { DetailCard, DetailGrid } from "@/components/detail-card"
import { PageHeader } from "@/components/page-header"
import { RecordActions } from "@/components/record-actions"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch, unpackResults } from "@/lib/api"
import type { Department, Paginated, User } from "@/lib/types"

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: user, error, isLoading, mutate } = useSWR<User>(`users/${id}/`, apiFetch)
  const { data: departments } = useSWR<Paginated<Department> | Department[]>("departments/?page_size=200", apiFetch)
  if (isLoading) return <Skeleton className="h-80" />
  if (error || !user) return <p className="rounded-xl border p-10 text-center">User not found or access denied.</p>
  const fields = [{ name: "username", label: "Username", required: true, defaultValue: user.username }, { name: "first_name", label: "First name", defaultValue: user.first_name }, { name: "last_name", label: "Last name", defaultValue: user.last_name }, { name: "email", label: "Email", type: "email" as const, defaultValue: user.email }, { name: "role", label: "Role", type: "select" as const, required: true, defaultValue: user.profile?.role || "viewer", options: [["super_admin", "Super admin"], ["admin", "Admin"], ["technician", "Technician"], ["viewer", "Viewer"]].map(([value, label]) => ({ value, label })) }, { name: "department_id", label: "Department", type: "select" as const, nullable: true, defaultValue: user.profile?.department_id, options: unpackResults(departments).map((item) => ({ label: item.name, value: String(item.id) })) }, { name: "phone_number", label: "Phone", defaultValue: user.profile?.phone_number }, { name: "employee_id", label: "Employee ID", nullable: true, defaultValue: user.profile?.employee_id }, { name: "is_staff", label: "Staff access", type: "checkbox" as const, defaultValue: user.is_staff }, { name: "is_active", label: "Active account", type: "checkbox" as const, defaultValue: user.is_active }]

  async function toggleActive() { await apiFetch(`users/${id}/toggle-active/`, { method: "POST", body: "{}" }); mutate() }
  return <><Button asChild variant="ghost" className="mb-4 -ml-2"><Link href="/users"><ArrowLeft />Back to users</Link></Button><PageHeader eyebrow="User account" title={`${user.first_name} ${user.last_name}`.trim() || user.username} description={`@${user.username}`} actions={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={toggleActive}><Power />{user.is_active ? "Deactivate" : "Activate"}</Button><ResourceFormDialog title="Reset password" description="Set a temporary password. The user will be required to change it." endpoint={`users/${id}/reset-password/`} method="POST" onSaved={() => mutate()} fields={[{ name: "password", label: "Temporary password", type: "password", required: true }]} trigger={<Button variant="outline"><KeyRound />Reset password</Button>} /><RecordActions endpoint={`users/${id}/`} backHref="/users" label="User" fields={fields} onChanged={() => mutate()} /></div>} /><DetailCard title="Account details"><DetailGrid items={[{ label: "Status", value: <StatusBadge value={user.is_active ? "Active" : "Inactive"} /> }, { label: "Username", value: user.username }, { label: "Email", value: user.email }, { label: "Role", value: user.profile?.role?.replaceAll("_", " ") }, { label: "Department", value: user.profile?.department }, { label: "Phone", value: user.profile?.phone_number }, { label: "Employee ID", value: user.profile?.employee_id }, { label: "Access", value: user.is_superuser ? "Superuser" : user.is_staff ? "Staff" : "Standard user" }]} /></DetailCard></>
}
