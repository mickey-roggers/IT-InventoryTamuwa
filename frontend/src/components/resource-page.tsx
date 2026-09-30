"use client"

import { useDeferredValue, useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"

import { CreateResourceDialog, type FormField } from "@/components/create-resource-dialog"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiFetch, unpackResults } from "@/lib/api"
import type { Paginated } from "@/lib/types"
import { cn } from "@/lib/utils"

export type Column<T> = {
  label: string
  render: (item: T) => React.ReactNode
  className?: string
}

export function ResourcePage<T>({ title, description, eyebrow, endpoint, searchPlaceholder, emptyMessage, columns, create, rowHref }: { title: string; description: string; eyebrow?: string; endpoint: string; searchPlaceholder: string; emptyMessage: string; columns: Column<T>[]; create?: { title: string; description: string; fields: FormField[]; buttonLabel?: string }; rowHref?: (item: T) => string }) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [page, setPage] = useState(1)
  const query = new URLSearchParams({ page: String(page) })
  if (deferredSearch) query.set("search", deferredSearch)
  const key = `${endpoint}?${query}`
  const { data, error, isLoading, mutate } = useSWR<Paginated<T> | T[]>(key, apiFetch, { keepPreviousData: true })
  const rows = unpackResults(data)
  const count = Array.isArray(data) ? data.length : data?.count || 0
  const hasNext = Array.isArray(data) ? false : Boolean(data?.next)
  const hasPrevious = page > 1

  return (
    <>
      <PageHeader title={title} description={description} eyebrow={eyebrow} actions={create ? <CreateResourceDialog {...create} endpoint={endpoint} onCreated={() => mutate()} /> : undefined} />
      <Card className="overflow-hidden border-border/70 shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b px-4 py-4 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} className="pl-9" placeholder={searchPlaceholder} /></div>
          <p className="text-xs text-muted-foreground"><span className="font-mono font-medium text-foreground">{count}</span> records</p>
        </div>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-5">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-10 w-full" />)}</div>
          ) : error ? (
            <div className="p-12 text-center"><p className="font-medium text-destructive">Could not load this data</p><p className="mt-1 text-sm text-muted-foreground">Make sure the Django backend is running.</p></div>
          ) : rows.length === 0 ? (
            <div className="p-14 text-center"><p className="font-medium">Nothing here yet</p><p className="mt-1 text-sm text-muted-foreground">{emptyMessage}</p></div>
          ) : (
            <div className="overflow-x-auto"><Table><TableHeader><TableRow>{columns.map((column, index) => <TableHead key={index} className={column.className}>{column.label}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.map((item, rowIndex) => { const href = rowHref?.(item); return <TableRow key={(item as { id?: string | number }).id ?? rowIndex} tabIndex={href ? 0 : undefined} className={cn(href && "cursor-pointer hover:bg-muted/60")} onClick={() => href && router.push(href)} onKeyDown={(event) => { if (href && (event.key === "Enter" || event.key === " ")) router.push(href) }}>{columns.map((column, index) => <TableCell key={index} className={column.className}>{column.render(item)}</TableCell>)}</TableRow> })}</TableBody></Table></div>
          )}
        </CardContent>
        {(hasPrevious || hasNext) && <div className="flex items-center justify-end gap-2 border-t px-4 py-3"><Button variant="outline" size="sm" disabled={!hasPrevious} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft />Previous</Button><span className="px-2 font-mono text-xs text-muted-foreground">Page {page}</span><Button variant="outline" size="sm" disabled={!hasNext} onClick={() => setPage((value) => value + 1)}>Next<ChevronRight /></Button></div>}
      </Card>
    </>
  )
}

