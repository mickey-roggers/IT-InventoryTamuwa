"use client"

import { FormEvent, ReactElement, ReactNode, cloneElement, useCallback, useState } from "react"
import { Loader2, Pencil, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Modal } from "@/components/modal"
import { apiErrorMessage, apiFetch } from "@/lib/api"

export type FieldValue = string | number | boolean | null | Array<string | number>

export type FormField = {
  name: string
  label: string
  type?: "text" | "email" | "password" | "number" | "date" | "datetime-local" | "textarea" | "select" | "multiselect" | "checkbox"
  placeholder?: string
  required?: boolean
  nullable?: boolean
  options?: { label: string; value: string }[]
  defaultValue?: FieldValue
  helpText?: string
}

type ResourceFormDialogProps = {
  title: string
  description: string
  endpoint: string
  fields: FormField[]
  onSaved: () => void
  method?: "POST" | "PATCH" | "PUT"
  buttonLabel?: string
  trigger?: ReactNode
  fixedValues?: Record<string, unknown>
  transformPayload?: (payload: Record<string, unknown>) => Record<string, unknown>
}

function stringValue(value: FieldValue | undefined) {
  if (value === null || value === undefined || Array.isArray(value) || typeof value === "boolean") return ""
  return String(value)
}

export function ResourceFormDialog({ title, description, endpoint, fields, onSaved, method = "POST", buttonLabel, trigger, fixedValues, transformPayload }: ResourceFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const close = useCallback(() => { if (!saving) setOpen(false) }, [saving])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError("")
    const form = new FormData(event.currentTarget)
    const payload: Record<string, unknown> = { ...fixedValues }
    fields.forEach((field) => {
      if (field.type === "checkbox") {
        payload[field.name] = form.has(field.name)
        return
      }
      if (field.type === "multiselect") {
        payload[field.name] = form.getAll(field.name).map(String)
        return
      }
      const value = form.get(field.name)
      if (value === "__none__") {
        if (method !== "POST" || field.nullable) payload[field.name] = null
        return
      }
      if (value !== null && value !== "") payload[field.name] = value
      else if (method !== "POST") payload[field.name] = field.nullable ? null : ""
    })
    try {
      await apiFetch(endpoint, { method, body: JSON.stringify(transformPayload ? transformPayload(payload) : payload) })
      setOpen(false)
      onSaved()
    } catch (value) {
      setError(apiErrorMessage(value))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {trigger
        ? cloneElement(trigger as ReactElement<{ onClick?: () => void }>, { onClick: () => { setError(""); setOpen(true) } })
        : <Button onClick={() => { setError(""); setOpen(true) }}>{method === "POST" ? <Plus /> : <Pencil />}{buttonLabel || (method === "POST" ? `Add ${title}` : `Edit ${title}`)}</Button>}
      <Modal open={open} onClose={close} title={title} description={description} className="sm:max-w-2xl">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => {
              const wide = field.type === "textarea" || field.type === "multiselect"
              return (
                <div key={field.name} className={wide ? "space-y-2 sm:col-span-2" : "space-y-2"}>
                  {field.type === "checkbox" ? (
                    <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm">
                      <input name={field.name} type="checkbox" defaultChecked={Boolean(field.defaultValue)} className="size-4 accent-primary" />
                      <span><span className="font-medium">{field.label}</span>{field.helpText && <span className="mt-0.5 block text-xs text-muted-foreground">{field.helpText}</span>}</span>
                    </label>
                  ) : (
                    <>
                      <Label htmlFor={field.name}>{field.label}</Label>
                      {field.type === "textarea" ? (
                        <Textarea id={field.name} name={field.name} required={field.required} placeholder={field.placeholder} defaultValue={stringValue(field.defaultValue)} />
                      ) : field.type === "select" ? (
                        <select id={field.name} name={field.name} required={field.required} defaultValue={stringValue(field.defaultValue) || (field.nullable ? "__none__" : "")} className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50">
                          {!field.nullable && <option value="" disabled={field.required}>{field.placeholder || `Select ${field.label.toLowerCase()}`}</option>}
                          {field.nullable && <option value="__none__">None</option>}
                          {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      ) : field.type === "multiselect" ? (
                        <select id={field.name} name={field.name} multiple required={field.required} defaultValue={(field.defaultValue as Array<string | number> | undefined)?.map(String)} className="min-h-32 w-full rounded-lg border bg-background px-3 py-2 text-sm">
                          {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      ) : (
                        <Input id={field.name} name={field.name} type={field.type || "text"} required={field.required} placeholder={field.placeholder} defaultValue={stringValue(field.defaultValue)} />
                      )}
                      {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
                    </>
                  )}
                </div>
              )
            })}
          </div>
          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive first-letter:uppercase">{error}</p>}
          <div className="-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />}{method === "POST" ? "Save" : "Save changes"}</Button></div>
        </form>
      </Modal>
    </>
  )
}

export function CreateResourceDialog(props: Omit<ResourceFormDialogProps, "method" | "onSaved"> & { onCreated: () => void }) {
  const { onCreated, ...rest } = props
  return <ResourceFormDialog {...rest} method="POST" onSaved={onCreated} />
}
