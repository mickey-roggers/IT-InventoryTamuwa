"use client"

import { FormEvent, useState } from "react"
import { Loader2, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { apiErrorMessage, apiFetch } from "@/lib/api"

export type FormField = {
  name: string
  label: string
  type?: "text" | "email" | "number" | "date" | "datetime-local" | "textarea" | "select"
  placeholder?: string
  required?: boolean
  options?: { label: string; value: string }[]
  defaultValue?: string
}

export function CreateResourceDialog({ title, description, endpoint, fields, onCreated, buttonLabel }: { title: string; description: string; endpoint: string; fields: FormField[]; onCreated: () => void; buttonLabel?: string }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError("")
    const form = new FormData(event.currentTarget)
    const payload: Record<string, FormDataEntryValue> = {}
    fields.forEach((field) => {
      const value = form.get(field.name)
      if (value !== null && value !== "") payload[field.name] = value
    })
    try {
      await apiFetch(endpoint, { method: "POST", body: JSON.stringify(payload) })
      setOpen(false)
      onCreated()
    } catch (value) {
      setError(apiErrorMessage(value))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus />{buttonLabel || `Add ${title}`}</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.name} className={field.type === "textarea" ? "space-y-2 sm:col-span-2" : "space-y-2"}>
                <Label htmlFor={field.name}>{field.label}</Label>
                {field.type === "textarea" ? (
                  <Textarea id={field.name} name={field.name} required={field.required} placeholder={field.placeholder} defaultValue={field.defaultValue} />
                ) : field.type === "select" ? (
                  <Select name={field.name} required={field.required} defaultValue={field.defaultValue}>
                    <SelectTrigger id={field.name} className="w-full"><SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} /></SelectTrigger>
                    <SelectContent>{field.options?.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input id={field.name} name={field.name} type={field.type || "text"} required={field.required} placeholder={field.placeholder} defaultValue={field.defaultValue} />
                )}
              </div>
            ))}
          </div>
          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive first-letter:uppercase">{error}</p>}
          <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />}Save</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

