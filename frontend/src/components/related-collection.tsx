"use client"

import { Pencil } from "lucide-react"

import { FormField, ResourceFormDialog } from "@/components/create-resource-dialog"
import { DeleteResourceButton } from "@/components/record-actions"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function RelatedCollection<T extends { id: number }>({ title, items, endpoint, createLabel, createFields, createValues, editFields, render, emptyMessage, onChanged, readOnly = false }: { title: string; items: T[]; endpoint: string; createLabel: string; createFields: FormField[]; createValues?: Record<string, unknown>; editFields?: (item: T) => FormField[]; render: (item: T) => React.ReactNode; emptyMessage: string; onChanged: () => void; readOnly?: boolean }) {
  const { user } = useAuth()
  const canManage = !readOnly && Boolean(user?.is_staff || user?.is_superuser || user?.profile?.role === "admin" || user?.profile?.role === "super_admin")
  return <Card className="border-border/70 shadow-sm">
    <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">{title}</CardTitle>{canManage && <ResourceFormDialog title={createLabel} description={`Add ${createLabel.toLowerCase()} to this record.`} endpoint={endpoint} fields={createFields} fixedValues={createValues} onSaved={onChanged} buttonLabel={createLabel} />}</CardHeader>
    <CardContent>
      {items.length ? <div className="divide-y rounded-lg border">{items.map((item) => <div key={item.id} className="flex items-start justify-between gap-4 p-4 [content-visibility:auto]"><div className="min-w-0 flex-1">{render(item)}</div>{canManage && <div className="flex shrink-0 items-center gap-1">{editFields && <ResourceFormDialog title={`Edit ${createLabel}`} description={`Update this ${createLabel.toLowerCase()}.`} endpoint={`${endpoint}${item.id}/`} fields={editFields(item)} method="PATCH" onSaved={onChanged} trigger={<Button variant="ghost" size="icon-sm" aria-label={`Edit ${createLabel}`}><Pencil /></Button>} />}<DeleteResourceButton endpoint={`${endpoint}${item.id}/`} label={createLabel} onDeleted={onChanged} iconOnly /></div>}</div>)}</div> : <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>}
    </CardContent>
  </Card>
}
