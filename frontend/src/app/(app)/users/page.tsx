"use client"

import useSWR from "swr"

import { useAuth } from "@/components/providers/auth-provider"
import { ResourcePage } from "@/components/resource-page"
import { StatusBadge } from "@/components/status-badge"
import { apiFetch, unpackResults } from "@/lib/api"
import type { Department, Paginated, User } from "@/lib/types"

export default function UsersPage() {
  const { user, loading } = useAuth()
  const { data: departments } = useSWR<Paginated<Department> | Department[]>("departments/?page_size=200", apiFetch)
  if (loading) return null
  const isAdmin = Boolean(user?.is_staff || user?.is_superuser || user?.profile?.role === "admin" || user?.profile?.role === "super_admin")
  if (!isAdmin) return <div className="rounded-xl border p-12 text-center"><p className="font-semibold">Administrator access required</p><p className="mt-2 text-sm text-muted-foreground">You do not have permission to manage user accounts.</p></div>

  return <ResourcePage<User>
    eyebrow="Administration"
    title="User management"
    description="Create accounts, assign roles, control access, and reset credentials."
    endpoint="users/"
    searchPlaceholder="Search users, email, or employee ID…"
    emptyMessage="No user accounts are available."
    rowHref={(item) => `/users/${item.id}`}
    create={{ title: "New user", description: "Create an account with a temporary password.", buttonLabel: "Add user", fields: [
      { name: "username", label: "Username", required: true },
      { name: "password", label: "Temporary password", type: "password", required: true },
      { name: "first_name", label: "First name" },
      { name: "last_name", label: "Last name" },
      { name: "email", label: "Email", type: "email" },
      { name: "role", label: "Role", type: "select", required: true, defaultValue: "viewer", options: [["super_admin", "Super admin"], ["admin", "Admin"], ["technician", "Technician"], ["viewer", "Viewer"]].map(([value, label]) => ({ value, label })) },
      { name: "department_id", label: "Department", type: "select", options: unpackResults(departments).map((item) => ({ label: item.name, value: String(item.id) })) },
      { name: "phone_number", label: "Phone" },
      { name: "employee_id", label: "Employee ID" },
      { name: "is_staff", label: "Staff access", type: "checkbox", defaultValue: false },
      { name: "is_active", label: "Active account", type: "checkbox", defaultValue: true },
    ] }}
    columns={[
      { label: "User", render: (item) => <div><p className="font-medium">{`${item.first_name} ${item.last_name}`.trim() || item.username}</p><p className="text-xs text-muted-foreground">@{item.username} · {item.email || "No email"}</p></div> },
      { label: "Role", render: (item) => <StatusBadge value={item.profile?.role?.replaceAll("_", " ") || "viewer"} /> },
      { label: "Department", render: (item) => item.profile?.department || "—" },
      { label: "Status", render: (item) => <StatusBadge value={item.is_active ? "Active" : "Inactive"} /> },
      { label: "Access", render: (item) => item.is_superuser ? "Superuser" : item.is_staff ? "Staff" : "Standard" },
    ]}
  />
}
