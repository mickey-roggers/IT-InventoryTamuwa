"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import { DetailCard, DetailGrid } from "@/components/detail-card";
import { PageHeader } from "@/components/page-header";
import { RecordActions } from "@/components/record-actions";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch, unpackResults } from "@/lib/api";
import { assetDisplayName } from "@/lib/format";
import type { Asset, Department, Paginated, Person } from "@/lib/types";

export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    data: person,
    error,
    isLoading,
    mutate,
  } = useSWR<Person>(`people/${id}/`, apiFetch);
  const { data: departments } = useSWR<Paginated<Department> | Department[]>(
    "departments/?page_size=200",
    apiFetch,
  );
  const { data: assets } = useSWR<Paginated<Asset> | Asset[]>(
    `assets/?person=${id}&page_size=200`,
    apiFetch,
  );
  if (isLoading) return <Skeleton className="h-80" />;
  if (error || !person)
    return (
      <p className="rounded-xl border p-10 text-center">Person not found.</p>
    );
  const department = unpackResults(departments).find(
    (item) => item.id === person.department,
  );
  const fields = [
    {
      name: "first_name",
      label: "First name",
      required: true,
      defaultValue: person.first_name,
    },
    {
      name: "last_name",
      label: "Last name",
      required: true,
      defaultValue: person.last_name,
    },
    {
      name: "department",
      label: "Department",
      type: "select" as const,
      nullable: true,
      defaultValue: person.department,
      options: unpackResults(departments).map((item) => ({
        label: item.name,
        value: String(item.id),
      })),
    },
  ];
  return (
    <>
      <Button asChild variant="ghost" className="mb-4 -ml-2">
        <Link href="/directory">
          <ArrowLeft />
          Back to directory
        </Link>
      </Button>
      <PageHeader
        eyebrow="Person"
        title={person.full_name}
        description={department?.name || "No department"}
        actions={
          <RecordActions
            endpoint={`people/${id}/`}
            backHref="/directory"
            label="Person"
            fields={fields}
            onChanged={() => mutate()}
          adminOnly
          />
        }
      />
      <div className="grid gap-4 lg:grid-cols-[.6fr_1.4fr]">
        <DetailCard title="Directory details">
          <DetailGrid
            items={[
              { label: "First name", value: person.first_name },
              { label: "Last name", value: person.last_name },
              { label: "Department", value: department?.name },
            ]}
          />
        </DetailCard>
        <DetailCard title="Assigned assets">
          {unpackResults(assets).length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {unpackResults(assets).map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell><p className="font-medium">{assetDisplayName(asset)}</p><p className="font-mono text-xs text-muted-foreground">{asset.asset_id}</p></TableCell>
                    <TableCell>{asset.model_description}</TableCell>
                    <TableCell><StatusBadge value={asset.status.name} /></TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="icon-sm">
                        <Link href={`/assets/${asset.id}`}>
                          <ArrowUpRight />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              No assets are assigned to this person.
            </p>
          )}
        </DetailCard>
      </div>
    </>
  );
}
