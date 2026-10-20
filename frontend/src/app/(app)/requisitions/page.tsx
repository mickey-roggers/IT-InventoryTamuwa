"use client"

import { FormEvent, useState } from "react"
import useSWR from "swr"
import { Loader2, Plus, Trash2 } from "lucide-react"

import { Modal } from "@/components/modal"
import { ResourcePage } from "@/components/resource-page"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/tailwind/button"
import { Input } from "@/components/tailwind/input"
import { Label } from "@/components/tailwind/label"
import { Textarea } from "@/components/tailwind/textarea"
import { apiErrorMessage, apiFetch, unpackResults } from "@/lib/api"
import { formatCurrency, formatDate } from "@/lib/format"
import type { Issue, Paginated, Project, Requisition } from "@/lib/types"

type DraftItem = {
  key: number
  item_type: "Asset" | "Service"
  item_name: string
  unit_price: string
  quantity: string
  is_approved: boolean
  rejection_reason: string
}

const newItem = (key: number): DraftItem => ({ key, item_type: "Asset", item_name: "", unit_price: "", quantity: "1", is_approved: true, rejection_reason: "" })

export default function RequisitionsPage() {
  const { data: issues } = useSWR<Paginated<Issue> | Issue[]>("issues/?page_size=200", apiFetch)
  const { data: projects } = useSWR<Paginated<Project> | Project[]>("projects/?page_size=200", apiFetch)
  return <ResourcePage<Requisition> eyebrow="Procurement" title="Requisitions" description="Monitor purchase requests and their approval or buying status." endpoint="requisitions/" searchPlaceholder="Search requisition number or title…" emptyMessage="No requisitions have been raised."
    rowHref={(item) => `/requisitions/${item.id}`}
    filters={[{ name: "status", label: "Statuses", options: ["Pending", "Approved", "Rejected", "On Hold", "Bought"].map((value) => ({ label: value, value })) }]}
    ordering={[{ label: "Newest", value: "-created_at" }, { label: "Oldest", value: "created_at" }, { label: "Number A–Z", value: "req_no" }, { label: "Title A–Z", value: "title" }, { label: "Status", value: "status" }]}
    create={{ title: "New requisition", description: "Open a procurement request with all of its assets and services.", buttonLabel: "New requisition", adminOnly: true, render: (onCreated) => <RequisitionCreateDialog issues={unpackResults(issues)} projects={unpackResults(projects)} onCreated={onCreated} /> }}
    columns={[
      { label: "Requisition", render: (item) => <div><p className="font-mono font-semibold">{item.req_no}</p><p className="mt-0.5 max-w-sm truncate text-xs text-muted-foreground">{item.title}</p></div> },
      { label: "Company", render: (item) => item.company },
      { label: "Status", render: (item) => <StatusBadge value={item.status} /> },
      { label: "Items", render: (item) => item.items.length },
      { label: "Approved total", render: (item) => <span className="font-mono">{formatCurrency(item.total_amount)}</span> },
      { label: "Created", render: (item) => <div><p>{formatDate(item.created_at)}</p><p className="text-xs text-muted-foreground">{item.created_by_username || "System"}</p></div> },
    ]} />
}

function RequisitionCreateDialog({ issues, projects, onCreated }: { issues: Issue[]; projects: Project[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [items, setItems] = useState<DraftItem[]>([newItem(1)])
  const [nextKey, setNextKey] = useState(2)

  function reset() { setItems([newItem(1)]); setNextKey(2); setError("") }
  function updateItem(key: number, values: Partial<DraftItem>) { setItems((current) => current.map((item) => item.key === key ? { ...item, ...values } : item)) }
  function addItem() { setItems((current) => [...current, newItem(nextKey)]); setNextKey((value) => value + 1) }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSaving(true)
    setError("")
    const linkedIssue = form.get("linked_issue")
    const linkedProject = form.get("linked_project")
    const payload = {
      req_no: form.get("req_no"), company: form.get("company"), title: form.get("title"), status: form.get("status"), description: form.get("description"),
      ...(linkedIssue ? { linked_issue: linkedIssue } : {}), ...(linkedProject ? { linked_project: linkedProject } : {}),
      items: items.map((item) => ({ item_type: item.item_type, item_name: item.item_name, unit_price: Number(item.unit_price), quantity: Number(item.quantity), is_approved: item.is_approved, rejection_reason: item.rejection_reason })),
    }
    try {
      await apiFetch("requisitions/", { method: "POST", body: JSON.stringify(payload) })
      setOpen(false); reset(); onCreated()
    } catch (caught) { setError(apiErrorMessage(caught)) } finally { setSaving(false) }
  }

  return <>
    <Button onClick={() => { reset(); setOpen(true) }}><Plus />New requisition</Button>
    <Modal open={open} onClose={() => { if (!saving) setOpen(false) }} title="New requisition" description="Add every asset or service to the same requisition before saving." className="sm:max-w-5xl">
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2"><Label htmlFor="req_no">Requisition number</Label><Input id="req_no" name="req_no" required placeholder="e.g. REQ-2026-041" /></div>
          <div className="space-y-2"><Label htmlFor="company">Company</Label><select id="company" name="company" defaultValue="Tamuwa" className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"><option>Tamuwa</option><option>Tera</option><option>Flux</option></select></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="title">Title</Label><Input id="title" name="title" required /></div>
          <div className="space-y-2"><Label htmlFor="status">Status</Label><select id="status" name="status" defaultValue="Pending" className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm">{["Pending", "Approved", "Rejected", "On Hold", "Bought"].map((value) => <option key={value}>{value}</option>)}</select></div>
          <div className="space-y-2"><Label htmlFor="linked_issue">Linked issue</Label><select id="linked_issue" name="linked_issue" className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"><option value="">No issue</option>{issues.filter((issue) => issue.status !== "Closed").map((issue) => <option key={issue.id} value={issue.id}>{issue.title}</option>)}</select></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="linked_project">Linked project</Label><select id="linked_project" name="linked_project" className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"><option value="">No project</option>{projects.filter((project) => project.status !== "Done").map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></div>
          <div className="space-y-2 sm:col-span-2 lg:col-span-4"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" /></div>
        </div>
        <section className="rounded-xl border">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3"><div><h3 className="font-medium">Requisition items</h3><p className="text-xs text-muted-foreground">Add multiple assets or services now; they remain separate line items.</p></div><Button type="button" variant="outline" size="sm" onClick={addItem}><Plus />Add item</Button></div>
          <div className="max-h-[24rem] space-y-3 overflow-y-auto p-4">
            {items.map((item, index) => <div key={item.key} className="grid gap-3 rounded-lg border bg-muted/20 p-3 md:grid-cols-[7rem_minmax(0,1fr)_9rem_6rem_auto_auto] md:items-end">
              <div className="space-y-2"><Label htmlFor={`type-${item.key}`}>Type</Label><select id={`type-${item.key}`} value={item.item_type} onChange={(event) => updateItem(item.key, { item_type: event.target.value as DraftItem["item_type"] })} className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"><option>Asset</option><option>Service</option></select></div>
              <div className="space-y-2"><Label htmlFor={`name-${item.key}`}>Item / service</Label><Input id={`name-${item.key}`} required value={item.item_name} onChange={(event) => updateItem(item.key, { item_name: event.target.value })} placeholder={`Item ${index + 1}`} /></div>
              <div className="space-y-2"><Label htmlFor={`price-${item.key}`}>Unit price</Label><Input id={`price-${item.key}`} type="number" min="0" step="0.01" required value={item.unit_price} onChange={(event) => updateItem(item.key, { unit_price: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor={`qty-${item.key}`}>Quantity</Label><Input id={`qty-${item.key}`} type="number" min="1" required value={item.quantity} onChange={(event) => updateItem(item.key, { quantity: event.target.value })} /></div>
              <label className="flex h-8 cursor-pointer items-center gap-2 whitespace-nowrap text-sm"><input type="checkbox" checked={item.is_approved} onChange={(event) => updateItem(item.key, { is_approved: event.target.checked, rejection_reason: event.target.checked ? "" : item.rejection_reason })} className="size-4 accent-primary" />Approved</label>
              <Button type="button" variant="ghost" size="icon-sm" className="text-destructive" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((entry) => entry.key !== item.key))} aria-label={`Remove item ${index + 1}`}><Trash2 /></Button>
              {!item.is_approved && <div className="space-y-2 md:col-span-6"><Label htmlFor={`reason-${item.key}`}>Reason not approved</Label><Input id={`reason-${item.key}`} required value={item.rejection_reason} onChange={(event) => updateItem(item.key, { rejection_reason: event.target.value })} /></div>}
            </div>)}
          </div>
        </section>
        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end"><Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />}Save requisition with {items.length} item{items.length === 1 ? "" : "s"}</Button></div>
      </form>
    </Modal>
  </>
}
