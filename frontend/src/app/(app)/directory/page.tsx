"use client"

import Link from "next/link"
import useSWR from "swr"
import { ArrowUpRight, Building2, UserRound } from "lucide-react"

import { CreateResourceDialog } from "@/components/create-resource-dialog"
import { PageHeader } from "@/components/page-header"
import { useAuth } from "@/components/providers/auth-provider"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiFetch, unpackResults } from "@/lib/api"
import type { Department, Paginated, Person } from "@/lib/types"

export default function DirectoryPage() {
  const { user } = useAuth()
  const { data: peopleData, isLoading: peopleLoading, mutate: mutatePeople } = useSWR<Paginated<Person> | Person[]>("people/?page_size=200", apiFetch)
  const { data: departmentData, isLoading: departmentsLoading, mutate: mutateDepartments } = useSWR<Paginated<Department> | Department[]>("departments/?page_size=200", apiFetch)
  const people = unpackResults(peopleData)
  const departments = unpackResults(departmentData)
  const departmentMap = new Map(departments.map((item) => [item.id, item.name]))
  const departmentOptions = departments.map((item) => ({ label: item.name, value: String(item.id) }))
  const isAdmin = Boolean(user?.is_staff || user?.is_superuser || user?.profile?.role === "admin" || user?.profile?.role === "super_admin")

  return <>
    <PageHeader eyebrow="Organisation" title="People & departments" description="Manage asset holders and the departments responsible for company equipment." actions={isAdmin ? <div className="flex gap-2"><CreateResourceDialog title="Person" description="Add someone who can receive company assets." endpoint="people/" buttonLabel="Add person" fields={[{ name: "first_name", label: "First name", required: true }, { name: "last_name", label: "Last name", required: true }, { name: "department", label: "Department", type: "select", options: departmentOptions }]} onCreated={() => mutatePeople()} /><CreateResourceDialog title="Department" description="Create an organisational department." endpoint="departments/" buttonLabel="Add department" fields={[{ name: "name", label: "Name", required: true }, { name: "description", label: "Description", type: "textarea" }]} onCreated={() => mutateDepartments()} /></div> : undefined} />
    <Tabs defaultValue="people">
      <TabsList><TabsTrigger value="people"><UserRound />People ({people.length})</TabsTrigger><TabsTrigger value="departments"><Building2 />Departments ({departments.length})</TabsTrigger></TabsList>
      <TabsContent value="people" className="mt-3"><Card className="overflow-hidden"><CardContent className="p-0">{peopleLoading ? <LoadingRows /> : people.length ? <Table><TableHeader><TableRow><TableHead>Person</TableHead><TableHead>Department</TableHead><TableHead /></TableRow></TableHeader><TableBody>{people.map((person) => <TableRow key={person.id}><TableCell><div className="flex items-center gap-3"><Avatar className="size-8"><AvatarFallback>{person.first_name[0]}{person.last_name[0]}</AvatarFallback></Avatar><span className="font-medium">{person.full_name}</span></div></TableCell><TableCell>{person.department ? departmentMap.get(person.department) || "Department" : "Not assigned"}</TableCell><TableCell><div className="flex justify-end"><Button asChild variant="ghost" size="icon-sm"><Link href={`/directory/people/${person.id}`} aria-label={`Open ${person.full_name}`}><ArrowUpRight /></Link></Button></div></TableCell></TableRow>)}</TableBody></Table> : <Empty text="No people have been added." />}</CardContent></Card></TabsContent>
      <TabsContent value="departments" className="mt-3"><Card className="overflow-hidden"><CardContent className="p-0">{departmentsLoading ? <LoadingRows /> : departments.length ? <Table><TableHeader><TableRow><TableHead>Department</TableHead><TableHead>Description</TableHead><TableHead>People</TableHead><TableHead /></TableRow></TableHeader><TableBody>{departments.map((department) => <TableRow key={department.id}><TableCell className="font-medium">{department.name}</TableCell><TableCell className="max-w-xl text-muted-foreground">{department.description || "—"}</TableCell><TableCell>{people.filter((person) => person.department === department.id).length}</TableCell><TableCell><div className="flex justify-end"><Button asChild variant="ghost" size="icon-sm"><Link href={`/directory/departments/${department.id}`} aria-label={`Open ${department.name}`}><ArrowUpRight /></Link></Button></div></TableCell></TableRow>)}</TableBody></Table> : <Empty text="No departments have been added." />}</CardContent></Card></TabsContent>
    </Tabs>
  </>
}

function LoadingRows() { return <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-10" />)}</div> }
function Empty({ text }: { text: string }) { return <p className="p-14 text-center text-muted-foreground">{text}</p> }
