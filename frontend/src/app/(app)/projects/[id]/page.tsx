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
import { assetDisplayName, formatCurrency, formatDate } from "@/lib/format";
import type {
  Category,
  Comment,
  Paginated,
  Project,
  ProjectItem,
} from "@/lib/types";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    data: project,
    error,
    isLoading,
    mutate,
  } = useSWR<Project>(`projects/${id}/`, apiFetch);
  const { data: items, mutate: mutateItems } = useSWR<
    Paginated<ProjectItem> | ProjectItem[]
  >(`project-items/?project=${id}&page_size=200`, apiFetch);
  const { data: comments, mutate: mutateComments } = useSWR<
    Paginated<Comment> | Comment[]
  >(`project-comments/?project=${id}&page_size=200`, apiFetch);
  const { data: categories } = useSWR<Paginated<Category> | Category[]>(
    "categories/?page_size=200",
    apiFetch,
  );
  if (isLoading) return <Skeleton className="h-[36rem]" />;
  if (error || !project)
    return (
      <p className="rounded-xl border p-10 text-center">Project not found.</p>
    );

  const categoryOptions = unpackResults(categories).map((item) => ({
    label: item.name,
    value: String(item.id),
  }));
  const projectItems = unpackResults(items);
  const total = projectItems.reduce(
    (sum, item) => sum + Number(item.total_price),
    0,
  );
  const fields = [
    {
      name: "title",
      label: "Title",
      required: true,
      defaultValue: project.title,
    },
    {
      name: "date",
      label: "Target date",
      type: "date" as const,
      nullable: true,
      defaultValue: project.date,
    },
    {
      name: "priority",
      label: "Priority",
      type: "select" as const,
      required: true,
      defaultValue: project.priority,
      options: ["Low", "Medium", "High"].map((value) => ({
        label: value,
        value,
      })),
    },
    {
      name: "status",
      label: "Status",
      type: "select" as const,
      required: true,
      defaultValue: project.status,
      options: ["Pending", "Done", "Rejected"].map((value) => ({
        label: value,
        value,
      })),
    },
    {
      name: "categories",
      label: "Asset categories",
      type: "multiselect" as const,
      defaultValue: project.categories,
      options: categoryOptions,
      helpText: "Hold Ctrl/Cmd to select multiple categories.",
    },
    {
      name: "description",
      label: "Description",
      type: "textarea" as const,
      defaultValue: project.description,
    },
    {
      name: "problem_statement",
      label: "Problem statement",
      type: "textarea" as const,
      defaultValue: project.problem_statement,
    },
    {
      name: "cost_breakdown",
      label: "Cost notes",
      type: "textarea" as const,
      defaultValue: project.cost_breakdown,
    },
    {
      name: "conclusion",
      label: "Conclusion",
      type: "textarea" as const,
      defaultValue: project.conclusion,
    },
    {
      name: "pending_reason",
      label: "Pending reason",
      type: "textarea" as const,
      defaultValue: project.pending_reason,
    },
    {
      name: "rejected_reason",
      label: "Rejected reason",
      type: "textarea" as const,
      defaultValue: project.rejected_reason,
    },
  ];
  const itemFields = (item?: ProjectItem) => [
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
      defaultValue: item?.unit_price || "0",
    },
    {
      name: "quantity",
      label: "Quantity",
      type: "number" as const,
      required: true,
      defaultValue: item?.quantity || 1,
    },
  ];

  return (
    <>
      <Button asChild variant="ghost" className="mb-4 -ml-2">
        <Link href="/projects">
          <ArrowLeft />
          Back to projects
        </Link>
      </Button>
      <PageHeader
        eyebrow="Project"
        title={project.title}
        description={`Owned by ${project.reported_by_username || "System"}`}
        actions={
          <RecordActions
            endpoint={`projects/${id}/`}
            backHref="/projects"
            label="Project"
            fields={fields}
            onChanged={() => mutate()}
            adminOnly
            canEdit={project.status !== "Done"}
          />
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_.6fr]">
        <div className="space-y-4">
          <DetailCard title="Description">
            <p className="whitespace-pre-wrap leading-6">
              {project.description || "No description provided."}
            </p>
          </DetailCard>
          <DetailCard title="Problem statement">
            <p className="whitespace-pre-wrap leading-6">
              {project.problem_statement || "No problem statement recorded."}
            </p>
          </DetailCard>
          {(project.conclusion || project.cost_breakdown) && (
            <DetailCard title="Notes">
              <div className="space-y-4">
                <p className="whitespace-pre-wrap">{project.cost_breakdown}</p>
                <p className="whitespace-pre-wrap">{project.conclusion}</p>
              </div>
            </DetailCard>
          )}
        </div>
        <DetailCard title="Project status">
          <DetailGrid
            items={[
              {
                label: "Priority",
                value: <StatusBadge value={project.priority} />,
              },
              {
                label: "Status",
                value: <StatusBadge value={project.status} />,
              },
              { label: "Target date", value: formatDate(project.date) },
              { label: "Budget items total", value: formatCurrency(total) },
              {
                label: "Categories",
                value:
                  project.categories
                    .map(
                      (categoryId) =>
                        unpackResults(categories).find(
                          (item) => item.id === categoryId,
                        )?.name,
                    )
                    .filter(Boolean)
                    .join(", ") || "—",
              },
              {
                label: "Last updated",
                value: formatDate(project.updated_at, true),
              },
              ...(project.pending_reason
                ? [{ label: "Pending reason", value: project.pending_reason }]
                : []),
              ...(project.rejected_reason
                ? [{ label: "Rejected reason", value: project.rejected_reason }]
                : []),
            ]}
          />
        </DetailCard>
      </div>
      {project.category_availability?.length > 0 && (
        <div className="mt-4">
          <DetailCard title="Category asset availability">
            <div className="grid gap-3 lg:grid-cols-2">
              {project.category_availability.map((entry) => (
                <div key={entry.category.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{entry.category.name}</p>
                    <StatusBadge value={`${entry.available_count} available`} />
                  </div>
                  <div className="mt-3 space-y-2">
                    {entry.assets.map((asset) => (
                      <Link
                        key={asset.id}
                        href={`/assets/${asset.id}`}
                        className="flex items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2 text-sm hover:bg-muted"
                      >
                        <span>
                          <span className="font-medium">{assetDisplayName(asset)}</span>
                          <span className="ml-2 font-mono text-xs text-muted-foreground">{asset.asset_id}</span>
                        </span>
                        <StatusBadge value={asset.status} />
                      </Link>
                    ))}
                    {!entry.assets.length && (
                      <p className="text-sm text-muted-foreground">
                        No assets in this category.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </DetailCard>
        </div>
      )}
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <RelatedCollection
          title={`Cost items · ${formatCurrency(total)}`}
          items={projectItems}
          endpoint="project-items/"
          createLabel="Project item"
          createValues={{ project: Number(id) }}
          createFields={itemFields()}
          editFields={itemFields}
          render={(item) => (
            <>
              <p className="font-medium">{item.item_name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.item_type} · {item.quantity} ×{" "}
                {formatCurrency(item.unit_price)} ={" "}
                {formatCurrency(item.total_price)}
              </p>
            </>
          )}
          emptyMessage="No project items added."
          onChanged={() => mutateItems()}
          readOnly={project.status === "Done"}
        />
        <RelatedCollection
          title="Comments"
          items={unpackResults(comments)}
          endpoint="project-comments/"
          createLabel="Comment"
          createValues={{ project: Number(id) }}
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
              <p className="whitespace-pre-wrap">{item.body}</p>
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
          readOnly={project.status === "Done"}
        />
      </div>
    </>
  );
}
