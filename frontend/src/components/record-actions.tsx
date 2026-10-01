"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Pencil, Trash2 } from "lucide-react"

import { FormField, ResourceFormDialog } from "@/components/create-resource-dialog"
import { Modal } from "@/components/modal"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { apiErrorMessage, apiFetch } from "@/lib/api"

export function RecordActions({ endpoint, backHref, label, fields, onChanged, adminOnly = false, canEdit = true, canDelete = true }: { endpoint: string; backHref: string; label: string; fields: FormField[]; onChanged: () => void; adminOnly?: boolean; canEdit?: boolean; canDelete?: boolean }) {
  const router = useRouter()
  const { user } = useAuth()
  const isAdmin = Boolean(user?.is_staff || user?.is_superuser || user?.profile?.role === "admin" || user?.profile?.role === "super_admin")
  if (adminOnly && !isAdmin) return null

  return <div className="flex flex-wrap items-center gap-2">
    {canEdit && <ResourceFormDialog title={`Edit ${label}`} description={`Update this ${label.toLowerCase()} record.`} endpoint={endpoint} fields={fields} method="PATCH" onSaved={onChanged} trigger={<Button variant="outline"><Pencil />Edit</Button>} />}
    {canDelete && <DeleteConfirmation endpoint={endpoint} label={label} description="This action cannot be undone. Related records may also be removed." onDeleted={() => { router.push(backHref); router.refresh() }} />}
  </div>
}

export function DeleteResourceButton({ endpoint, label, onDeleted, iconOnly = false }: { endpoint: string; label: string; onDeleted: () => void; iconOnly?: boolean }) {
  return <DeleteConfirmation endpoint={endpoint} label={label} onDeleted={onDeleted} iconOnly={iconOnly} />
}

function DeleteConfirmation({ endpoint, label, onDeleted, iconOnly = false, description = "This action cannot be undone." }: { endpoint: string; label: string; onDeleted: () => void; iconOnly?: boolean; description?: string }) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")

  async function remove() {
    setDeleting(true)
    setError("")
    try {
      await apiFetch(endpoint, { method: "DELETE" })
      setOpen(false)
      onDeleted()
    } catch (value) {
      setError(apiErrorMessage(value))
      setDeleting(false)
    }
  }

  return <>
    <Button variant={iconOnly ? "ghost" : "destructive"} size={iconOnly ? "icon-sm" : "default"} className={iconOnly ? "text-destructive" : undefined} aria-label={`Delete ${label}`} onClick={() => { setError(""); setOpen(true) }}><Trash2 />{!iconOnly && "Delete"}</Button>
    <Modal open={open} onClose={() => { if (!deleting) setOpen(false) }} title={`Delete ${label}?`} description={description} footer={<><Button type="button" variant="outline" disabled={deleting} onClick={() => setOpen(false)}>Cancel</Button><Button type="button" variant="destructive" disabled={deleting} onClick={() => void remove()}>{deleting && <Loader2 className="animate-spin" />}Delete</Button></>}>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </Modal>
  </>
}
