"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import useSWR from "swr"
import { ArrowUpRight, Check, Loader2, Pencil, X } from "lucide-react"

import { ResourcePage } from "@/components/resource-page"
import { useAuth } from "@/components/providers/auth-provider"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/modal"
import { apiErrorMessage, apiFetch, unpackResults } from "@/lib/api"
import { assetDisplayName, formatCurrency, formatDate } from "@/lib/format"
import type { Asset, Category, Department, Paginated, Person, Requisition, StatusOption } from "@/lib/types"

export default function AssetsPage() {
  const { user } = useAuth()
  const { data: categories } = useSWR<Paginated<Category> | Category[]>("categories/?page_size=100", apiFetch)
  const { data: statuses } = useSWR<Paginated<StatusOption> | StatusOption[]>("status-options/?page_size=100", apiFetch)
  const { data: people } = useSWR<Paginated<Person> | Person[]>("people/?page_size=100", apiFetch)
  const { data: departments } = useSWR<Paginated<Department> | Department[]>("departments/?page_size=100", apiFetch)
  const { data: requisitions } = useSWR<Paginated<Requisition> | Requisition[]>("requisitions/?page_size=200", apiFetch)
  const canEdit = Boolean(user?.is_staff || user?.is_superuser || user?.profile?.role === "admin" || user?.profile?.role === "super_admin")

  return <ResourcePage<Asset>
    eyebrow="Inventory"
    title="Assets"
    description="Search, register, and inspect every device in the organisation."
    endpoint="assets/"
    searchPlaceholder="Search alias, asset ID, serial number, model, or assignee…"
    emptyMessage="Add the first asset to begin tracking inventory."
    rowHref={(item) => `/assets/${item.id}`}
    preserveListState
    exportUrl="assets/export/"
    filters={[
      { name: "category", label: "Categories", options: unpackResults(categories).map((item) => ({ label: item.name, value: String(item.id) })) },
      { name: "status", label: "Statuses", options: unpackResults(statuses).map((item) => ({ label: item.name, value: String(item.id) })) },
      { name: "assigned", label: "Assignment", options: [{ label: "Assigned", value: "assigned" }, { label: "Unassigned", value: "unassigned" }] },
    ]}
    ordering={[{ label: "Newest", value: "-created_at" }, { label: "Alias A–Z", value: "alias_name" }, { label: "Alias Z–A", value: "-alias_name" }, { label: "Asset ID A–Z", value: "asset_id" }, { label: "Asset ID Z–A", value: "-asset_id" }, { label: "Category", value: "category__name" }, { label: "Model", value: "model_description" }, { label: "Purchase cost", value: "-purchase_cost" }, { label: "Purchase date", value: "-purchase_date" }, { label: "Status", value: "status__name" }, { label: "Vendor", value: "purchased_from" }]}
    create={{ title: "New asset", description: "Register a device in the inventory.", buttonLabel: "Add asset", adminOnly: true, fields: [
      { name: "alias_name", label: "Alias name", placeholder: "e.g. Reception phone", helpText: "The familiar internal name shown throughout the system." },
      { name: "asset_id", label: "Asset ID (optional)", placeholder: "Leave blank to generate from category code", helpText: "Generated automatically when left blank." },
      { name: "serial_number", label: "Serial number", required: true },
      { name: "model_description", label: "Model / description", required: true },
      { name: "category_id", label: "Category", type: "select", required: true, options: unpackResults(categories).map((item) => ({ label: item.name, value: String(item.id) })) },
      { name: "status_id", label: "Status", type: "select", required: true, options: unpackResults(statuses).map((item) => ({ label: item.name, value: String(item.id) })) },
      { name: "maintenance_description", label: "Maintenance issue description", type: "textarea", helpText: "Required when the selected status is Under Maintenance. This creates the maintenance record automatically." },
      { name: "assigned_to_id", label: "Assigned to", type: "select", options: unpackResults(people).map((item) => ({ label: item.full_name, value: String(item.id) })) },
      { name: "department_id", label: "Department", type: "select", options: unpackResults(departments).map((item) => ({ label: item.name, value: String(item.id) })) },
      { name: "purchase_date", label: "Purchase date", type: "date" },
      { name: "purchased_from", label: "Vendor" },
      { name: "purchase_cost", label: "Purchase cost (KES)", type: "number" },
      { name: "requisition", label: "Requisition", type: "select", options: unpackResults(requisitions).map((item) => ({ label: `${item.req_no} · ${item.title}`, value: String(item.id) })) },
      { name: "admin_comments", label: "Notes", type: "textarea" },
    ] }}
    columns={[
      { label: "Alias name", render: (item, { refresh }) => <EditableAliasName asset={item} canEdit={canEdit} onSaved={refresh} /> },
      { label: "Category", render: (item) => item.category.name },
      { label: "Serial", render: (item) => <span className="font-mono text-xs">{item.serial_number}</span> },
      { label: "Assigned to", render: (item, { refresh }) => <EditableAssignee asset={item} people={unpackResults(people)} canEdit={canEdit} onSaved={refresh} /> },
      { label: "Status", render: (item) => <StatusBadge value={item.status.name} /> },
      { label: "Purchased", render: (item) => <div><p>{formatDate(item.purchase_date)}</p><p className="text-xs text-muted-foreground">{formatCurrency(item.purchase_cost)}</p></div> },
      { label: "", className: "w-10", render: (item, { rowHref }) => <Button asChild variant="ghost" size="icon-sm"><Link href={rowHref || `/assets/${item.id}`} aria-label={`Open ${assetDisplayName(item)}`}><ArrowUpRight /></Link></Button> },
    ]}
  />
}

function EditableAssignee({ asset, people, canEdit, onSaved }: { asset: Asset; people: Person[]; canEdit: boolean; onSaved: () => void }) {
  const initialValue = asset.assigned_to ? String(asset.assigned_to.id) : "__none__"
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState("")

  function cancel() {
    setValue(initialValue)
    setError("")
    setEditing(false)
    setConfirming(false)
  }

  async function save(syncLinkedOwnership: boolean) {
    const selected = people.find((person) => String(person.id) === value)
    setSaving(true)
    setError("")
    try {
      await apiFetch(`assets/${asset.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          assigned_to_id: selected?.id ?? null,
          department_id: selected?.department ?? null,
          sync_linked_ownership: syncLinkedOwnership,
        }),
      })
      setEditing(false)
      setConfirming(false)
      onSaved()
    } catch (caught) {
      setError(apiErrorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  function requestSave() {
    if (value === initialValue) {
      setEditing(false)
      return
    }
    if (asset.linked_asset_count > 0) setConfirming(true)
    else void save(false)
  }

  if (!canEdit) {
    return <div><p>{asset.assigned_to?.full_name || "Unassigned"}</p><p className="text-xs text-muted-foreground">{asset.department?.name || "No department"}</p></div>
  }

  return (
    <div className="min-w-52" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      {editing ? (
        <div>
          <div className="flex items-center gap-1.5">
            <select
              autoFocus
              aria-label={`Assigned person for ${asset.asset_id}`}
              value={value}
              disabled={saving}
              className="h-8 min-w-40 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") { event.preventDefault(); requestSave() }
                if (event.key === "Escape") { event.preventDefault(); cancel() }
              }}
            >
              <option value="__none__">Unassigned</option>
              {people.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}
            </select>
            <Button type="button" size="icon-sm" disabled={saving} onClick={requestSave} aria-label="Save assignee">{saving ? <Loader2 className="animate-spin" /> : <Check />}</Button>
            <Button type="button" variant="ghost" size="icon-sm" disabled={saving} onClick={cancel} aria-label="Cancel assignee edit"><X /></Button>
          </div>
          {error && <p className="mt-1 max-w-72 text-xs text-destructive">{error}</p>}
        </div>
      ) : (
        <button type="button" className="group -ml-2 rounded-md border border-dashed border-primary/25 bg-primary/5 px-2 py-1 text-left transition-colors hover:border-primary/50 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" onClick={() => { setError(""); setEditing(true) }} title="Click to change assignment">
          <span className="flex items-center gap-1.5 text-sm font-medium"><span>{asset.assigned_to?.full_name || "Unassigned"}</span><Pencil className="size-3 text-primary opacity-60 transition-opacity group-hover:opacity-100" /></span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{asset.department?.name || "No department"}</span>
        </button>
      )}
      <Modal
        open={confirming}
        onClose={() => { if (!saving) setConfirming(false) }}
        title="Change ownership of linked assets?"
        description={`${assetDisplayName(asset)} is connected to ${asset.linked_asset_count} other asset${asset.linked_asset_count === 1 ? "" : "s"}. Choose whether this ownership change should follow the whole chain.`}
        footer={<><Button type="button" variant="outline" disabled={saving} onClick={() => setConfirming(false)}>Cancel</Button><Button type="button" variant="outline" disabled={saving} onClick={() => void save(false)}>This asset only</Button><Button type="button" disabled={saving} onClick={() => void save(true)}>{saving && <Loader2 className="animate-spin" />}All linked assets</Button></>}
      >
        <p className="text-sm text-muted-foreground">The selected person and their department will be applied. Assignment history will be kept for every changed asset.</p>
      </Modal>
    </div>
  )
}

function EditableAliasName({ asset, canEdit, onSaved }: { asset: Asset; canEdit: boolean; onSaved: () => void }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(asset.alias_name || "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function cancel() {
    setValue(asset.alias_name || "")
    setError("")
    setEditing(false)
  }

  async function save() {
    const aliasName = value.trim()
    if (aliasName === (asset.alias_name || "").trim()) {
      setEditing(false)
      return
    }

    setSaving(true)
    setError("")
    try {
      await apiFetch(`assets/${asset.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ alias_name: aliasName }),
      })
      setValue(aliasName)
      setEditing(false)
      onSaved()
    } catch (caught) {
      setError(apiErrorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  if (!canEdit) {
    return <div><p className="text-sm font-semibold">{assetDisplayName(asset)}</p><p className="mt-0.5 max-w-56 truncate font-mono text-xs text-muted-foreground">{asset.asset_id} · {asset.model_description}</p></div>
  }

  return (
    <div className="min-w-56" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      {editing ? (
        <div>
          <div className="flex items-center gap-1.5">
            <Input
              ref={inputRef}
              value={value}
              disabled={saving}
              aria-label={`Alias name for ${asset.asset_id}`}
              className="h-7 max-w-56 bg-background font-medium"
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  void save()
                } else if (event.key === "Escape") {
                  event.preventDefault()
                  cancel()
                }
              }}
            />
            <Button type="button" size="icon-sm" disabled={saving} onClick={() => void save()} aria-label="Save alias name">{saving ? <Loader2 className="animate-spin" /> : <Check />}</Button>
            <Button type="button" variant="ghost" size="icon-sm" disabled={saving} onClick={cancel} aria-label="Cancel alias edit"><X /></Button>
          </div>
          {error && <p className="mt-1 max-w-72 text-xs text-destructive">{error}</p>}
        </div>
      ) : (
        <button type="button" className="group -ml-2 rounded-md border border-dashed border-primary/25 bg-primary/5 px-2 py-1 text-left transition-colors hover:border-primary/50 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" onClick={() => { setError(""); setEditing(true) }} title="Click to edit alias name">
          <span className="flex items-center gap-1.5 text-sm font-semibold"><span>{value.trim() || asset.asset_id}</span><Pencil className="size-3 text-primary opacity-60 transition-opacity group-hover:opacity-100" /></span>
          <span className="mt-0.5 block max-w-56 truncate font-mono text-xs text-muted-foreground">{asset.asset_id} · {asset.model_description}</span>
        </button>
      )}
    </div>
  )
}

