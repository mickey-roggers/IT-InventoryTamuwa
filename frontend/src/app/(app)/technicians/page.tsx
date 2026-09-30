"use client"

import { Mail, Phone } from "lucide-react"
import { ResourcePage } from "@/components/resource-page"
import { StatusBadge } from "@/components/status-badge"
import type { Technician } from "@/lib/types"

export default function TechniciansPage() {
  return <ResourcePage<Technician> eyebrow="Service network" title="Technicians" description="Maintain the approved technician and repair-company directory." endpoint="technicians/" searchPlaceholder="Search technicians or companies…" emptyMessage="No active technicians are registered."
    rowHref={(item) => `/technicians/${item.id}`}
    create={{ title: "New technician", description: "Add a repair contact to the service network.", buttonLabel: "Add technician", fields: [
      { name: "company_name", label: "Company", required: true },
      { name: "technician_name", label: "Technician name", required: true },
      { name: "email", label: "Email", type: "email" },
      { name: "phone_number", label: "Phone" },
      { name: "alternate_phone", label: "Alternate phone" },
      { name: "specialization", label: "Specialization" },
      { name: "address", label: "Address", type: "textarea" },
    ] }}
    columns={[
      { label: "Technician", render: (item) => <div><p className="font-medium">{item.technician_name}</p><p className="text-xs text-muted-foreground">{item.company_name}</p></div> },
      { label: "Specialization", render: (item) => item.specialization || "General support" },
      { label: "Contact", render: (item) => <div className="space-y-1 text-sm">{item.phone_number && <p className="flex items-center gap-1.5"><Phone className="size-3.5 text-muted-foreground" />{item.phone_number}</p>}{item.email && <p className="flex items-center gap-1.5"><Mail className="size-3.5 text-muted-foreground" />{item.email}</p>}{!item.phone_number && !item.email && "—"}</div> },
      { label: "Services", render: (item) => item.services.length },
      { label: "Assistants", render: (item) => item.assistants.length },
      { label: "Status", render: (item) => <StatusBadge value={item.is_active ? "Active" : "Inactive"} /> },
    ]} />
}

