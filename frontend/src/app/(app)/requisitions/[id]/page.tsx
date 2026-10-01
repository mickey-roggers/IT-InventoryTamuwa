"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft } from "lucide-react";

import { DetailCard, DetailGrid } from "@/components/detail-card";
import { PageHeader } from "@/components/page-header";
import { RecordActions } from "@/components/record-actions";
import { RelatedCollection } from "@/components/related-collection";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, unpackResults } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import type {
  Issue,
  Paginated,
  Project,
  Requisition,
  RequisitionItem,
} from "@/lib/types";

export default function RequisitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    data: requisition,
    error,
    isLoading,
    mutate,
  } = useSWR<Requisition>(`requisitions/${id}/`, apiFetch);
  const { data: issues } = useSWR<Paginated<Issue> | Issue[]>(
    "issues/?page_size=200",
    apiFetch,
  );
  const { data: projects } = useSWR<Paginated<Project> | Project[]>(
    "projects/?page_size=200",
    apiFetch,
  );
  if (isLoading) return <Skeleton className="h-[36rem]" />;
  if (error || !requisition)
    return (
      <p className="rounded-xl border p-10 text-center">
        Requisition not found.
      </p>
    );

  const fields = [
    {
      name: "req_no",
      label: "Requisition number",
      required: true,
      defaultValue: requisition.req_no,
    },
    {
      name: "company",
      label: "Company",
      type: "select" as const,
      required: true,
      defaultValue: requisition.company,
      options: ["Tamuwa", "Tera", "Flux"].map((value) => ({
        label: value,
        value,
      })),
    },
    {
      name: "title",
      label: "Title",
      required: true,
      defaultValue: requisition.title,
    },
    {
      name: "status",
      label: "Status",
      type: "select" as const,
      required: true,
      defaultValue: requisition.status,
      options: ["Pending", "Approved", "Rejected", "On Hold", "Bought"].map(
        (value) => ({ label: value, value }),
      ),
    },
    {
      name: "linked_issue",
      label: "Linked issue",
      type: "select" as const,
      nullable: true,
      defaultValue: requisition.linked_issue,
      options: unpackResults(issues).map((item) => ({
        label: item.title,
        value: String(item.id),
      })),
    },
    {
      name: "linked_project",
      label: "Linked project",
      type: "select" as const,
      nullable: true,
      defaultValue: requisition.linked_project,
      options: unpackResults(projects).map((item) => ({
        label: item.title,
        value: String(item.id),
      })),
    },
    {
      name: "description",
      label: "Description",
      type: "textarea" as const,
      defaultValue: requisition.description,
    },
  ];
  const itemFields = (item?: RequisitionItem) => [
    {
      name: "item_type",
      label: "Type",
      type: "select" as const,
      required: true,
      defaultValue: item?.item_type || "Asset",
      options: ["Asset", "Service"].map((value) => ({ label: value, value })),
    },
    {
      name: "item_name",
      label: "Item / service",
      required: true,
      defaultValue: item?.item_name,
    },
    {
      name: "unit_price",
      label: "Unit price (KES)",
      type: "number" as const,
      required: true,
      defaultValue: item?.unit_price,
    },
    {
      name: "quantity",
      label: "Quantity",
      type: "number" as const,
      required: true,
      defaultValue: item?.quantity || 1,
    },
    {
      name: "is_approved",
      label: "Approved",
      type: "checkbox" as const,
      defaultValue: item?.is_approved ?? true,
      helpText: "Only approved items count toward the requisition total.",
    },
    {
      name: "rejection_reason",
      label: "Reason if not approved",
      defaultValue: item?.rejection_reason,
    },
  ];
  const linkedIssue = unpackResults(issues).find(
    (item) => item.id === requisition.linked_issue,
  );
  const linkedProject = unpackResults(projects).find(
    (item) => item.id === requisition.linked_project,
  );

  return (
    <>
      <Button asChild variant="ghost" className="mb-4 -ml-2">
        <Link href="/requisitions">
          <ArrowLeft />
          Back to requisitions
        </Link>
      </Button>
      <PageHeader
        eyebrow={`${requisition.company} requisition`}
        title={requisition.req_no}
        description={requisition.title}
        actions={
          <RecordActions
            endpoint={`requisitions/${id}/`}
            backHref="/requisitions"
            label="Requisition"
            fields={fields}
            onChanged={() => mutate()}
            adminOnly
            canEdit={requisition.status !== "Bought"}
            canDelete={requisition.status !== "Bought"}
          />
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
        <DetailCard title="Request">
          <p className="whitespace-pre-wrap leading-6">
            {requisition.description || "No description provided."}
          </p>
        </DetailCard>
        <DetailCard title="Summary">
          <DetailGrid
            items={[
              {
                label: "Status",
                value: <StatusBadge value={requisition.status} />,
              },
              {
                label: "Approved total",
                value: formatCurrency(requisition.total_amount),
              },
              { label: "Created by", value: requisition.created_by_username },
              {
                label: "Created",
                value: formatDate(requisition.created_at, true),
              },
              {
                label: "Linked issue",
                value: linkedIssue ? (
                  <Link
                    className="text-primary hover:underline"
                    href={`/issues/${linkedIssue.id}`}
                  >
                    {linkedIssue.title}
                  </Link>
                ) : (
                  "—"
                ),
              },
              {
                label: "Linked project",
                value: linkedProject ? (
                  <Link
                    className="text-primary hover:underline"
                    href={`/projects/${linkedProject.id}`}
                  >
                    {linkedProject.title}
                  </Link>
                ) : (
                  "—"
                ),
              },
            ]}
          />
        </DetailCard>
      </div>
      <div className="mt-4">
        <RelatedCollection
          title={`Items · ${formatCurrency(requisition.total_amount)}`}
          items={requisition.items}
          endpoint="requisition-items/"
          createLabel="Requisition item"
          createValues={{ requisition: Number(id) }}
          createFields={itemFields()}
          editFields={itemFields}
          render={(item) => (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{item.item_name}</p>
                <StatusBadge
                  value={item.is_approved ? "Approved" : "Not approved"}
                />
                {item.is_processed && <StatusBadge value="Processed" />}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.item_type} · {item.quantity} ×{" "}
                {formatCurrency(item.unit_price)} ={" "}
                {formatCurrency(item.total_price)}
              </p>
              {item.rejection_reason && (
                <p className="mt-2 text-xs text-destructive">
                  {item.rejection_reason}
                </p>
              )}
            </>
          )}
          emptyMessage="No requisition items added."
          onChanged={() => mutate()}
          readOnly={requisition.status === "Bought"}
        />
      </div>
    </>
  );
}
