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
import { Button } from "@/components/tailwind/button";
import { Skeleton } from "@/components/tailwind/skeleton";
import { apiFetch, unpackResults } from "@/lib/api";
import { assetDisplayName, assetOptionLabel, formatDate } from "@/lib/format";
import type { Asset, Comment, Department, Issue, MaintenanceLog, Paginated } from "@/lib/types";

export default function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    data: issue,
    error,
    isLoading,
    mutate,
  } = useSWR<Issue>(`issues/${id}/`, apiFetch);
  const { data: comments, mutate: mutateComments } = useSWR<
    Paginated<Comment> | Comment[]
  >(`issue-comments/?issue=${id}&page_size=200`, apiFetch);
  const { data: assets } = useSWR<Paginated<Asset> | Asset[]>(
    "assets/?page_size=200",
    apiFetch,
  );
  const { data: departments } = useSWR<Paginated<Department> | Department[]>(
    "departments/?page_size=200",
    apiFetch,
  );
  const { data: maintenance } = useSWR<
    Paginated<MaintenanceLog> | MaintenanceLog[]
  >(`maintenance-logs/?issue=${id}&page_size=200`, apiFetch);
  if (isLoading) return <Skeleton className="h-[32rem]" />;
  if (error || !issue)
    return (
      <p className="rounded-xl border p-10 text-center">Issue not found.</p>
    );

  const asset = unpackResults(assets).find((item) => item.id === issue.asset);
  const department = unpackResults(departments).find(
    (item) => item.id === issue.department,
  );
  const fields = [
    {
      name: "title",
      label: "Title",
      required: true,
      defaultValue: issue.title,
    },
    {
      name: "priority",
      label: "Priority",
      type: "select" as const,
      required: true,
      defaultValue: issue.priority,
      options: ["Low", "Medium", "High", "Critical"].map((value) => ({
        label: value,
        value,
      })),
    },
    {
      name: "status",
      label: "Status",
      type: "select" as const,
      required: true,
      defaultValue: issue.status,
      options: ["Open", "Monitoring", "Resolved", "Closed"].map((value) => ({
        label: value,
        value,
      })),
    },
    {
      name: "asset",
      label: "Related asset",
      type: "select" as const,
      nullable: true,
      defaultValue: issue.asset,
      options: unpackResults(assets).map((item) => ({
        label: assetOptionLabel(item),
        value: String(item.id),
      })),
    },
    {
      name: "department",
      label: "Department",
      type: "select" as const,
      nullable: true,
      defaultValue: issue.department,
      options: unpackResults(departments).map((item) => ({
        label: item.name,
        value: String(item.id),
      })),
    },
    {
      name: "description",
      label: "Description",
      type: "textarea" as const,
      defaultValue: issue.description,
    },
  ];

  return (
    <>
      <Button asChild variant="ghost" className="mb-4 -ml-2">
        <Link href="/issues">
          <ArrowLeft />
          Back to issues
        </Link>
      </Button>
      <PageHeader
        eyebrow="Issue"
        title={issue.title}
        description={`Reported by ${issue.reported_by_username || "System"} on ${formatDate(issue.created_at)}`}
        actions={
          <RecordActions
            endpoint={`issues/${id}/`}
            backHref="/issues"
            label="Issue"
            fields={fields}
            onChanged={() => mutate()}
          adminOnly
          canEdit={issue.status !== "Closed"}
          />
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_.6fr]">
        <DetailCard title="Issue details">
          <p className="whitespace-pre-wrap leading-6">
            {issue.description || "No description provided."}
          </p>
        </DetailCard>
        <DetailCard title="Status">
          <DetailGrid
            items={[
              {
                label: "Priority",
                value: <StatusBadge value={issue.priority} />,
              },
              { label: "Status", value: <StatusBadge value={issue.status} /> },
              {
                label: "Asset",
                value: asset ? (
                  <Link
                    href={`/assets/${asset.id}`}
                    className="text-primary hover:underline"
                  >
                    {assetDisplayName(asset)}
                  </Link>
                ) : (
                  "—"
                ),
              },
              { label: "Department", value: department?.name },
              { label: "Updated", value: formatDate(issue.updated_at, true) },
            ]}
          />
        </DetailCard>
      </div>
      <div className="mt-4">
        <DetailCard title="Linked maintenance">
          {unpackResults(maintenance).length ? (
            <div className="space-y-2">
              {unpackResults(maintenance).map((item) => (
                <Link
                  key={item.id}
                  href={`/maintenance/${item.id}`}
                  className="block rounded-lg border p-3 hover:bg-muted"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{formatDate(item.date_reported)}</span>
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
              No maintenance records are linked to this issue.
            </p>
          )}
        </DetailCard>
      </div>
      <div className="mt-4">
        <RelatedCollection
          title="Comments"
          items={unpackResults(comments)}
          endpoint="issue-comments/"
          createLabel="Comment"
          createValues={{ issue: Number(id) }}
          createFields={[
            {
              name: "body",
              label: "Comment",
              type: "textarea",
              required: true,
            },
          ]}
          editFields={(item) => [
            {
              name: "body",
              label: "Comment",
              type: "textarea",
              required: true,
              defaultValue: item.body,
            },
          ]}
          render={(item) => (
            <>
              <p className="whitespace-pre-wrap leading-6">{item.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {item.author_username || "System"} ·{" "}
                {formatDate(item.created_at, true)}
              </p>
            </>
          )}
          emptyMessage="No comments have been added."
          onChanged={() => {
            void mutateComments();
            void mutate();
          }}
        />
      </div>
    </>
  );
}
