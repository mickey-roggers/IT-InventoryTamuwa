"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Pencil, Trash2 } from "lucide-react"

import { FormField, ResourceFormDialog } from "@/components/create-resource-dialog"
import { useAuth } from "@/components/providers/auth-provider"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { apiErrorMessage, apiFetch } from "@/lib/api"

export function RecordActions({ endpoint, backHref, label, fields, onChanged, adminOnly = false, canEdit = true, canDelete = true }: { endpoint: string; backHref: string; label: string; fields: FormField[]; onChanged: () => void; adminOnly?: boolean; canEdit?: boolean; canDelete?: boolean }) {
  const router = useRouter()
  const { user } = useAuth()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")

  async function remove() {
    setDeleting(true)
    setError("")
    try {
      await apiFetch(endpoint, { method: "DELETE" })
      router.push(backHref)
      router.refresh()
    } catch (value) {
      setError(apiErrorMessage(value))
      setDeleting(false)
    }
  }

  const isAdmin = Boolean(user?.is_staff || user?.is_superuser || user?.profile?.role === "admin" || user?.profile?.role === "super_admin")
  if (adminOnly && !isAdmin) return null

  return <div className="flex flex-wrap items-center gap-2">
    {canEdit && <ResourceFormDialog title={`Edit ${label}`} description={`Update this ${label.toLowerCase()} record.`} endpoint={endpoint} fields={fields} method="PATCH" onSaved={onChanged} trigger={<Button variant="outline"><Pencil />Edit</Button>} />}
    {canDelete && <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="destructive"><Trash2 />Delete</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Delete {label}?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. Related records may also be removed.</AlertDialogDescription></AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={deleting} onClick={(event) => { event.preventDefault(); void remove() }}>{deleting && <Loader2 className="animate-spin" />}Delete</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>}
  </div>
}

export function DeleteResourceButton({ endpoint, label, onDeleted, iconOnly = false }: { endpoint: string; label: string; onDeleted: () => void; iconOnly?: boolean }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")

  async function remove() {
    setDeleting(true)
    setError("")
    try {
      await apiFetch(endpoint, { method: "DELETE" })
      onDeleted()
    } catch (value) {
      setError(apiErrorMessage(value))
      setDeleting(false)
    }
  }

  return <AlertDialog>
    <AlertDialogTrigger asChild><Button variant="ghost" size={iconOnly ? "icon-sm" : "sm"} className="text-destructive" aria-label={`Delete ${label}`}><Trash2 />{!iconOnly && "Delete"}</Button></AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>Delete {label}?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={deleting} onClick={(event) => { event.preventDefault(); void remove() }}>{deleting && <Loader2 className="animate-spin" />}Delete</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
}
