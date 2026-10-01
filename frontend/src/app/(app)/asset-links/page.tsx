"use client";

import Link from "next/link";
import useSWR from "swr";
import { ExternalLink } from "lucide-react";

import { CreateResourceDialog } from "@/components/create-resource-dialog";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/components/providers/auth-provider";
import { DeleteResourceButton } from "@/components/record-actions";
import { StatusBadge } from "@/components/status-badge";
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
import { formatDate } from "@/lib/format";
import type {
  Asset,
  AssetLink,
  AssetLinkHistory,
  Paginated,
} from "@/lib/types";

export default function AssetLinksPage() {
  const { user } = useAuth();
  const { data, isLoading, mutate } = useSWR<
    Paginated<AssetLink> | AssetLink[]
  >("asset-links/?page_size=200", apiFetch);
  const { data: assets } = useSWR<Paginated<Asset> | Asset[]>(
    "assets/?page_size=200",
    apiFetch,
  );
  const { data: history } = useSWR<
    Paginated<AssetLinkHistory> | AssetLinkHistory[]
  >("asset-link-history/?recent=true&page_size=50", apiFetch);
  const assetOptions = unpackResults(assets).map((asset) => ({
    label: `${asset.asset_id} · ${asset.model_description}`,
    value: String(asset.id),
  }));
  const assetMap = new Map(
    unpackResults(assets).map((asset) => [asset.id, asset]),
  );
  const links = unpackResults(data).filter(
    (link) => link.asset < link.linked_asset,
  );
  const recentlyUnlinked = unpackResults(history).filter(
    (link) => link.asset < link.linked_asset,
  );
  const isAdmin = Boolean(
    user?.is_staff ||
    user?.is_superuser ||
    user?.profile?.role === "admin" ||
    user?.profile?.role === "super_admin",
  );

  return (
    <>
      <PageHeader
        eyebrow="Inventory relationships"
        title="Asset links"
        description="Connect related equipment such as laptops, docks, chargers, monitors, and peripherals."
        actions={
          isAdmin ? (
            <CreateResourceDialog
              title="Asset link"
              description="Choose two inventory records to connect. Existing chains are joined automatically."
              endpoint="asset-links/"
              buttonLabel="Link assets"
              fields={[
                {
                  name: "asset",
                  label: "Primary asset",
                  type: "select",
                  required: true,
                  options: assetOptions,
                },
                {
              name: "linked_asset_ids",
              label: "Related assets",
              type: "multiselect",
                  required: true,
                  options: assetOptions,
              helpText: "Select one or more assets. Existing link chains will be joined.",
                },
                { name: "notes", label: "Notes", type: "textarea" },
              ]}
              onCreated={() => mutate()}
            />
          ) : undefined
        }
      />
      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-10" />
              ))}
            </div>
          ) : links.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Primary asset</TableHead>
                    <TableHead>Linked asset</TableHead>
                    <TableHead>Link state</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Linked</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((link) => {
                    const first = assetMap.get(link.asset);
                    const second = assetMap.get(link.linked_asset);
                    const active =
                      first?.status.name === "In Use" &&
                      second?.status.name === "In Use";
                    const incomplete = [
                      first?.status.name,
                      second?.status.name,
                    ].some(
                      (value) =>
                        value === "Missing" || value === "Under Maintenance",
                    );
                    return (
                      <TableRow key={link.id}>
                        <TableCell>
                          <AssetLinkCell
                            asset={first}
                            label={link.asset_display}
                          />
                        </TableCell>
                        <TableCell>
                          <AssetLinkCell
                            asset={second}
                            label={link.linked_asset_display}
                          />
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            value={
                              incomplete
                                ? "Incomplete"
                                : active
                                  ? "Active"
                                  : "Inactive"
                            }
                          />
                        </TableCell>
                        <TableCell className="max-w-md text-muted-foreground">
                          {link.notes || "—"}
                        </TableCell>
                        <TableCell>{formatDate(link.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            {isAdmin && (
                              <DeleteResourceButton
                                endpoint={`asset-links/${link.id}/`}
                                label="Asset link"
                                onDeleted={() => mutate()}
                                iconOnly
                              />
                            )}
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
              No assets have been linked yet.
            </p>
          )}
        </CardContent>
      </Card>
      <Card className="mt-4 overflow-hidden border-border/70 shadow-sm">
        <CardContent className="p-0">
          <div className="border-b px-5 py-4">
            <h2 className="font-semibold">Recently unlinked</h2>
            <p className="text-sm text-muted-foreground">
              Link history from the last 30 days.
            </p>
          </div>
          {recentlyUnlinked.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Previously linked asset</TableHead>
                  <TableHead>Unlinked</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentlyUnlinked.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">
                      {item.asset_display}
                    </TableCell>
                    <TableCell className="font-mono">
                      {item.linked_asset_display}
                    </TableCell>
                    <TableCell>{formatDate(item.unlinked_at, true)}</TableCell>
                    <TableCell>
                      {item.unlinked_by_username || "System"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No links were removed in the last 30 days.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function AssetLinkCell({
  asset,
  label,
}: {
  asset: Asset | undefined;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div>
        <p className="font-mono font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          {asset?.model_description}
        </p>
      </div>
      {asset && (
        <Button asChild variant="ghost" size="icon-sm">
          <Link href={`/assets/${asset.id}`} aria-label={`Open ${label}`}>
            <ExternalLink />
          </Link>
        </Button>
      )}
    </div>
  );
}
