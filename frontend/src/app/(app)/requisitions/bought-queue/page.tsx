"use client";

import Link from "next/link";
import useSWR from "swr";
import { ExternalLink, Link2, PlusCircle } from "lucide-react";

import { ResourceFormDialog } from "@/components/create-resource-dialog";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { assetOptionLabel, formatCurrency } from "@/lib/format";
import type {
  Asset,
  Category,
  Department,
  Paginated,
  Person,
  Requisition,
  RequisitionItem,
  StatusOption,
} from "@/lib/types";

export default function BoughtItemsQueuePage() {
  const { user } = useAuth();
  const { data, isLoading, mutate } = useSWR<
    Paginated<RequisitionItem> | RequisitionItem[]
  >("requisition-items/?bought_queue=true&page_size=200", apiFetch);
  const { data: requisitions } = useSWR<Paginated<Requisition> | Requisition[]>(
    "requisitions/?page_size=200",
    apiFetch,
  );
  const { data: assets } = useSWR<Paginated<Asset> | Asset[]>(
    "assets/?page_size=200",
    apiFetch,
  );
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
  const items = unpackResults(data);
  const reqMap = new Map(
    unpackResults(requisitions).map((item) => [item.id, item]),
  );
  const assetOptions = unpackResults(assets).map((asset) => ({
    label: assetOptionLabel(asset),
    value: String(asset.id),
  }));
  const isAdmin = Boolean(user?.is_staff || user?.is_superuser || user?.profile?.role === "admin" || user?.profile?.role === "super_admin");

  return (
    <>
      <PageHeader
        eyebrow="Procurement intake"
        title="Bought items queue"
        description="Link each purchased asset line to its inventory record. Quantities greater than one remain queued until every unit is linked."
      />
      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-10" />
              ))}
            </div>
          ) : items.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requisition</TableHead>
                    <TableHead>Purchased item</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const req = reqMap.get(item.requisition);
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <p className="font-mono font-medium">
                            {req?.req_no || `#${item.requisition}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {req?.company}
                          </p>
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.item_name}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>
                          {formatCurrency(item.total_price)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            {isAdmin && <>
                            <ResourceFormDialog
                              title="Add purchased item to assets"
                              description="Register a new inventory record and remove one unit from this queue."
                              endpoint="assets/"
                              method="POST"
                              fixedValues={{ requisition: item.requisition, requisition_item_id: item.id }}
                              fields={[
                                { name: "alias_name", label: "Alias name", helpText: "The familiar internal name shown throughout the system." },
                                { name: "asset_id", label: "Asset ID (optional)", helpText: "Leave blank to generate from the category code." },
                                { name: "model_description", label: "Model / description", required: true, defaultValue: item.item_name },
                                { name: "serial_number", label: "Serial number", required: true },
                                { name: "category_id", label: "Category", type: "select", required: true, options: unpackResults(categories).map((value) => ({ label: value.name, value: String(value.id) })) },
                                { name: "status_id", label: "Status", type: "select", required: true, options: unpackResults(statuses).map((value) => ({ label: value.name, value: String(value.id) })) },
                                { name: "assigned_to_id", label: "Assigned to", type: "select", options: unpackResults(people).map((value) => ({ label: value.full_name, value: String(value.id) })) },
                                { name: "department_id", label: "Department", type: "select", options: unpackResults(departments).map((value) => ({ label: value.name, value: String(value.id) })) },
                                { name: "purchase_date", label: "Purchase date", type: "date" },
                                { name: "purchase_cost", label: "Purchase cost (KES)", type: "number", defaultValue: item.unit_price },
                                { name: "purchased_from", label: "Vendor" },
                                { name: "admin_comments", label: "Notes", type: "textarea" },
                              ]}
                              onSaved={() => mutate()}
                              trigger={<Button size="sm"><PlusCircle />Add to assets</Button>}
                            />
                            <ResourceFormDialog
                              title="Link purchased item"
                              description="Select an existing inventory asset that matches this purchase."
                              endpoint={`requisition-items/${item.id}/process/`}
                              method="POST"
                              fields={[
                                {
                                  name: "asset_id",
                                  label: "Inventory asset",
                                  type: "select",
                                  required: true,
                                  options: assetOptions,
                                },
                              ]}
                              onSaved={() => mutate()}
                              trigger={
                                <Button size="sm" variant="outline">
                                  <Link2 />
                                  Same as
                                </Button>
                              }
                            />
                            </>}
                            <Button asChild variant="ghost" size="icon-sm">
                              <Link
                                href={`/requisitions/${item.requisition}`}
                                aria-label="Open requisition"
                              >
                                <ExternalLink />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="p-14 text-center text-muted-foreground">
              All bought asset items have been processed.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
