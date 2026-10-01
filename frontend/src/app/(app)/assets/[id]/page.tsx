"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import {
  ArrowLeft,
  Calendar,
  CircleDollarSign,
  Cpu,
  Hash,
  MapPin,
  UserRound,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { DetailCard } from "@/components/detail-card";
import { CreateResourceDialog } from "@/components/create-resource-dialog";
import { useAuth } from "@/components/providers/auth-provider";
import {
  DeleteResourceButton,
  RecordActions,
} from "@/components/record-actions";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, unpackResults } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import type {
  Asset,
  AssetLink,
  AssetLinkHistory,
  Category,
  Department,
  MaintenanceLog,
  Paginated,
  Person,
  Requisition,
  StatusOption,
} from "@/lib/types";

type ActivityRecord = {
  id: number;
  action: string;
  description: string;
  timestamp: string;
  user: { username: string } | null;
};

type Assignment = {
  id: number;
  asset: string;
  person: Person | null;
  department: Department | null;
  start_date: string;
  end_date: string | null;
  notes: string;
};

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const {
    data: asset,
    error,
    isLoading,
    mutate,
  } = useSWR<Asset>(`assets/${id}/`, apiFetch);
  const { data: categories } = useSWR<Paginated<Category> | Category[]>(
    "categories/?page_size=200",
    apiFetch,
  );
  const { data: statuses } = useSWR<Paginated<StatusOption> | StatusOption[]>(
    "status-options/?page_size=200",
    apiFetch,
  );
  const { data: people } = useSWR<Paginated<Person> | Person[]>(
    "people/?page_size=200",
    apiFetch,
  );
  const { data: departments } = useSWR<Paginated<Department> | Department[]>(
    "departments/?page_size=200",
    apiFetch,
  );
  const { data: assignments, mutate: mutateAssignments } = useSWR<
    Paginated<Assignment> | Assignment[]
  >(`assignment-history/?asset=${id}&page_size=200`, apiFetch);
  const { data: links, mutate: mutateLinks } = useSWR<
    Paginated<AssetLink> | AssetLink[]
  >(`asset-links/?asset=${id}&page_size=200`, apiFetch);
  const { data: allAssets } = useSWR<Paginated<Asset> | Asset[]>(
    "assets/?page_size=500",
    apiFetch,
  );
  const { data: requisitions } = useSWR<Paginated<Requisition> | Requisition[]>(
    "requisitions/?page_size=200",
    apiFetch,
  );
  const { data: maintenance } = useSWR<
    Paginated<MaintenanceLog> | MaintenanceLog[]
  >(`maintenance-logs/?asset=${id}&page_size=200`, apiFetch);
  const { data: activities } = useSWR<
    Paginated<ActivityRecord> | ActivityRecord[]
  >(`activity-logs/?asset=${id}&page_size=200`, apiFetch);
  const { data: linkHistory } = useSWR<
    Paginated<AssetLinkHistory> | AssetLinkHistory[]
  >(`asset-link-history/?asset=${id}&page_size=50`, apiFetch);
  if (isLoading) return <Skeleton className="h-[32rem] w-full" />;
  if (error || !asset)
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <p className="font-semibold">Asset not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/assets">Back to assets</Link>
        </Button>
      </div>
    );

  const facts = [
    { label: "Category", value: asset.category.name, icon: Cpu },
    { label: "Serial number", value: asset.serial_number, icon: Hash },
    {
      label: "Assigned to",
      value: asset.assigned_to?.full_name || "Unassigned",
      icon: UserRound,
    },
    {
      label: "Department",
      value: asset.department?.name || "No department",
      icon: MapPin,
    },
    {
      label: "Purchase date",
      value: formatDate(asset.purchase_date),
      icon: Calendar,
    },
    {
      label: "Purchase cost",
      value: formatCurrency(asset.purchase_cost),
      icon: CircleDollarSign,
    },
  ];
  const isAdmin = Boolean(
    user?.is_staff ||
    user?.is_superuser ||
    user?.profile?.role === "admin" ||
    user?.profile?.role === "super_admin",
  );

  const fields = [
    {
      name: "asset_id",
      label: "Asset ID",
      required: true,
      defaultValue: asset.asset_id,
    },
    {
      name: "serial_number",
      label: "Serial number",
      required: true,
      defaultValue: asset.serial_number,
    },
    {
      name: "model_description",
      label: "Model / description",
      required: true,
      defaultValue: asset.model_description,
    },
    {
      name: "category_id",
      label: "Category",
      type: "select" as const,
      required: true,
      defaultValue: asset.category.id,
      options: unpackResults(categories).map((item) => ({
        label: item.name,
        value: String(item.id),
      })),
    },
    {
      name: "status_id",
      label: "Status",
      type: "select" as const,
      required: true,
      defaultValue: asset.status.id,
      options: unpackResults(statuses).map((item) => ({
        label: item.name,
        value: String(item.id),
      })),
    },
    {
      name: "assigned_to_id",
      label: "Assigned to",
      type: "select" as const,
      nullable: true,
      defaultValue: asset.assigned_to?.id,
      options: unpackResults(people).map((item) => ({
        label: item.full_name,
        value: String(item.id),
      })),
    },
    {
      name: "department_id",
      label: "Department",
      type: "select" as const,
      nullable: true,
      defaultValue: asset.department?.id,
      options: unpackResults(departments).map((item) => ({
        label: item.name,
        value: String(item.id),
      })),
    },
    {
      name: "purchase_date",
      label: "Purchase date",
      type: "date" as const,
      nullable: true,
      defaultValue: asset.purchase_date,
    },
    {
      name: "purchased_from",
      label: "Vendor",
      defaultValue: asset.purchased_from,
    },
    {
      name: "purchase_cost",
      label: "Purchase cost (KES)",
      type: "number" as const,
      nullable: true,
      defaultValue: asset.purchase_cost,
    },
    {
      name: "admin_comments",
      label: "Notes",
      type: "textarea" as const,
      defaultValue: asset.admin_comments,
    },
    {
      name: "requisition",
      label: "Requisition",
      type: "select" as const,
      nullable: true,
      defaultValue: asset.requisition,
      options: unpackResults(requisitions).map((item) => ({
        label: `${item.req_no} · ${item.title}`,
        value: String(item.id),
      })),
    },
  ];

  return (
    <>
      <Button asChild variant="ghost" className="mb-4 -ml-2">
        <Link href="/assets">
          <ArrowLeft />
          Back to assets
        </Link>
      </Button>
      <PageHeader
        eyebrow="Asset record"
        title={asset.asset_id}
        description={asset.model_description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={asset.status.name} className="px-3 py-1" />
            <RecordActions
              endpoint={`assets/${id}/`}
              backHref="/assets"
              label="Asset"
              fields={fields}
              onChanged={() => mutate()}
              adminOnly
            />
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_.6fr]">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Asset details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              {facts.map((fact) => (
                <div key={fact.label} className="flex gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <fact.icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {fact.label}
                    </p>
                    <p className="mt-1 text-sm font-medium">{fact.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <Separator className="my-6" />
            <div>
              <p className="text-xs text-muted-foreground">
                Administrative notes
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                {asset.admin_comments || "No notes recorded."}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Procurement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-xs text-muted-foreground">Vendor</p>
              <p className="mt-1 text-sm font-medium">
                {asset.purchased_from || "Not recorded"}
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground">Requisition</p>
              <p className="mt-1 text-sm font-medium">
                {asset.requisition_display || "Not linked"}
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground">Last known person</p>
              <p className="mt-1 text-sm font-medium">
                {asset.last_known_person?.full_name || "Not recorded"}
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground">Last updated</p>
              <p className="mt-1 text-sm font-medium">
                {formatDate(asset.updated_at, true)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <DetailCard title="Assignment history">
          {unpackResults(assignments).length ? (
            <div className="space-y-3">
              {unpackResults(assignments).map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2 rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {item.person?.full_name ||
                        item.department?.name ||
                        "Unassigned"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(item.start_date, true)} —{" "}
                      {item.end_date
                        ? formatDate(item.end_date, true)
                        : "Current"}
                    </p>
                    {item.notes && <p className="mt-2 text-sm">{item.notes}</p>}
                  </div>
                  {isAdmin && (
                    <DeleteResourceButton
                      endpoint={`assignment-history/${item.id}/`}
                      label="assignment history"
                      onDeleted={() => void mutateAssignments()}
                      iconOnly
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-muted-foreground">
              No assignment history.
            </p>
          )}
        </DetailCard>
        <DetailCard title="Linked assets">
          {isAdmin && (
            <div className="mb-3">
              <CreateResourceDialog
                title="Link asset"
                description="Link this record to another asset. Existing chains are joined automatically."
                endpoint="asset-links/"
                buttonLabel="Link asset"
                fixedValues={{ asset: asset.id }}
                fields={[
                  {
                    name: "linked_asset",
                    label: "Related asset",
                    type: "select",
                    required: true,
                    options: unpackResults(allAssets)
                      .filter((item) => item.id !== asset.id)
                      .map((item) => ({
                        label: `${item.asset_id} · ${item.model_description}`,
                        value: String(item.id),
                      })),
                  },
                  { name: "notes", label: "Notes", type: "textarea" },
                ]}
                onCreated={() => void mutateLinks()}
              />
            </div>
          )}
          {unpackResults(links).length ? (
            <div className="space-y-2">
              {unpackResults(links).map((link) => {
                const linkedId =
                  link.asset === asset.id ? link.linked_asset : link.asset;
                const label =
                  link.asset === asset.id
                    ? link.linked_asset_display
                    : link.asset_display;
                return (
                  <Link
                    key={link.id}
                    href={`/assets/${linkedId}`}
                    className="block rounded-lg border p-3 hover:bg-muted"
                  >
                    <p className="font-mono font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">
                      {link.notes || "Linked asset"}
                    </p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="py-6 text-center text-muted-foreground">
              No linked assets.
            </p>
          )}
        </DetailCard>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <DetailCard title="Maintenance records">
          {unpackResults(maintenance).length ? (
            <div className="space-y-2">
              {unpackResults(maintenance).map((item) => (
                <Link
                  key={item.id}
                  href={`/maintenance/${item.id}`}
                  className="block rounded-lg border p-3 hover:bg-muted"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {formatDate(item.date_reported)}
                    </span>
                    <StatusBadge value={item.maintenance_status} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-muted-foreground">
              No maintenance records.
            </p>
          )}
        </DetailCard>
        <DetailCard title="Activity log">
          {unpackResults(activities).length ? (
            <div className="space-y-2">
              {unpackResults(activities).map((item) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge value={item.action.replaceAll("_", " ")} />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(item.timestamp, true)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">{item.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-muted-foreground">
              No activity recorded.
            </p>
          )}
        </DetailCard>
        <DetailCard title="Previous links">
          {unpackResults(linkHistory).length ? (
            <div className="space-y-2">
              {unpackResults(linkHistory)
                .filter((item) => item.asset === asset.id)
                .map((item) => (
                  <div key={item.id} className="rounded-lg border p-3">
                    <p className="font-mono font-medium">
                      {item.linked_asset_display}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Unlinked {formatDate(item.unlinked_at, true)} by{" "}
                      {item.unlinked_by_username || "System"}
                    </p>
                  </div>
                ))}
            </div>
          ) : (
            <p className="py-6 text-center text-muted-foreground">
              No previous links.
            </p>
          )}
        </DetailCard>
      </div>
    </>
  );
}
