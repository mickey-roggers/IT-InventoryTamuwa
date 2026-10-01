"use client"

import useSWR from "swr"
import { KeyRound, Pencil } from "lucide-react"

import { ResourceFormDialog } from "@/components/create-resource-dialog"
import { DetailCard, DetailGrid } from "@/components/detail-card"
import { PageHeader } from "@/components/page-header"
import { useAuth } from "@/components/providers/auth-provider"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { apiFetch, unpackResults } from "@/lib/api"
import type { Department, Paginated } from "@/lib/types"

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const { data: departments } = useSWR<Paginated<Department> | Department[]>("departments/?page_size=200", apiFetch)
  if (!user) return null
  const initials = `${user.first_name?.[0] || ""}${user.last_name?.[0] || user.username[0]}`.toUpperCase()
  const departmentOptions = unpackResults(departments).map((item) => ({ label: item.name, value: String(item.id) }))

  return <>
    {user.profile?.must_change_password && <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">Password change required</p><p className="mt-1">Choose a new password before continuing to use this account.</p></div>}
    <PageHeader eyebrow="Account" title="Profile" description="Manage your personal details and account password." actions={<div className="flex flex-wrap gap-2"><ResourceFormDialog title="Edit profile" description="Update your contact and organisation details." endpoint="auth/me/" method="PATCH" onSaved={refreshUser} fields={[{ name: "first_name", label: "First name", defaultValue: user.first_name }, { name: "last_name", label: "Last name", defaultValue: user.last_name }, { name: "email", label: "Email", type: "email", defaultValue: user.email }, { name: "department_id", label: "Department", type: "select", nullable: true, defaultValue: user.profile?.department_id, options: departmentOptions }, { name: "phone_number", label: "Phone number", defaultValue: user.profile?.phone_number }, { name: "employee_id", label: "Employee ID", nullable: true, defaultValue: user.profile?.employee_id }]} trigger={<Button variant="outline"><Pencil />Edit profile</Button>} /><ResourceFormDialog title="Change password" description={user.profile?.must_change_password ? "Choose a secure new password." : "Enter your current password and choose a secure new password."} endpoint="auth/change-password/" method="POST" onSaved={refreshUser} fields={[...(user.profile?.must_change_password ? [] : [{ name: "current_password", label: "Current password", type: "password" as const, required: true }]), { name: "new_password", label: "New password", type: "password", required: true, helpText: "Use at least eight characters and avoid common passwords." }]} trigger={<Button><KeyRound />Change password</Button>} /></div>} />
    <div className="grid gap-4 lg:grid-cols-[.45fr_1fr]">
      <DetailCard title="Account"><div className="flex flex-col items-center py-5 text-center"><Avatar className="size-20"><AvatarFallback className="bg-primary text-xl text-primary-foreground">{initials}</AvatarFallback></Avatar><p className="mt-4 text-lg font-semibold">{`${user.first_name} ${user.last_name}`.trim() || user.username}</p><p className="text-sm text-muted-foreground">@{user.username}</p></div></DetailCard>
      <DetailCard title="Profile details"><DetailGrid items={[{ label: "Email", value: user.email }, { label: "Role", value: user.profile?.role?.replaceAll("_", " ") }, { label: "Department", value: user.profile?.department }, { label: "Phone", value: user.profile?.phone_number }, { label: "Employee ID", value: user.profile?.employee_id }, { label: "Access", value: user.is_superuser ? "Superuser" : user.is_staff ? "Staff" : "Standard user" }]} /></DetailCard>
    </div>
  </>
}
