"use client"

import useSWR from "swr"
import { Building2 } from "lucide-react"
import { ResourcePage } from "@/components/resource-page"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { apiFetch, unpackResults } from "@/lib/api"
import type { Department, Paginated, Person } from "@/lib/types"

export default function DirectoryPage() {
  const { data: departments } = useSWR<Paginated<Department> | Department[]>("departments/?page_size=100", apiFetch)
  const departmentMap = new Map(unpackResults(departments).map((item) => [item.id, item.name]))
  return <ResourcePage<Person> eyebrow="People" title="Directory" description="People and departments that receive and hold company assets." endpoint="people/" searchPlaceholder="Search people…" emptyMessage="No people are available in the directory."
    create={{ title: "New person", description: "Add someone who can be assigned company assets.", buttonLabel: "Add person", fields: [
      { name: "first_name", label: "First name", required: true },
      { name: "last_name", label: "Last name", required: true },
      { name: "department", label: "Department", type: "select", options: unpackResults(departments).map((item) => ({ label: item.name, value: String(item.id) })) },
    ] }}
    columns={[
      { label: "Person", render: (item) => <div className="flex items-center gap-3"><Avatar className="size-8"><AvatarFallback className="bg-primary/10 text-xs text-primary">{item.first_name[0]}{item.last_name[0]}</AvatarFallback></Avatar><p className="font-medium">{item.full_name}</p></div> },
      { label: "Department", render: (item) => <span className="inline-flex items-center gap-2"><Building2 className="size-3.5 text-muted-foreground" />{item.department ? departmentMap.get(item.department) || "Department" : "Not assigned"}</span> },
    ]} />
}

